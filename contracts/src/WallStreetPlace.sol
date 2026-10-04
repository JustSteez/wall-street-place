// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IStockToken} from "./interfaces/IStockToken.sol";
import {IWallStreetPlace} from "./interfaces/IWallStreetPlace.sol";

/// @title Wall Street Place
/// @notice A shared 100x100 on-chain pixel canvas where teams are stocks. You may paint for a
///         team only while your wallet holds that team's Stock Token. Tokens are only read,
///         never transferred or held by this contract. Seasons reset the canvas.
/// @dev Each pixel is one byte: high nibble = team id (1..15, 0 = empty), low nibble = color.
///      Pixels are packed big-endian, 32 per storage word, so a season's words concatenate
///      directly into the canvas byte string.
contract WallStreetPlace is Ownable2Step, IWallStreetPlace {
    // ---------------------------------------------------------------- constants

    uint256 public constant SIZE = 100;
    uint256 public constant PIXELS = SIZE * SIZE;
    uint256 private constant WORDS = (PIXELS + 31) / 32;
    uint8 public constant MAX_TEAMS = 15;
    uint8 public constant COLORS = 16;
    uint64 public constant PROTECT_DURATION = 1 hours;
    uint64 public constant MIN_COOLDOWN = 5 seconds;
    uint64 public constant MAX_COOLDOWN = 1 days;
    uint64 public constant MIN_SEASON = 1 hours;
    uint64 public constant MAX_SEASON = 90 days;
    uint256 public constant MAX_COST = 1_000 ether;
    uint96 public constant MAX_MIN_SHARES = 1 ether;
    uint256 private constant MAX_MULTIPLIER = 1e30;
    uint256 private constant MULTIPLIER_ONE = 1e18;
    uint256 private constant MAX_TICKER_LENGTH = 10;

    // ---------------------------------------------------------------- types

    struct Team {
        address token;
        uint96 minShares; // share-equivalent units (18 decimals), ERC-8056 adjusted
        string ticker;
    }

    // ---------------------------------------------------------------- storage

    ERC20Burnable public immutable placeToken;

    Team[] private _teams; // teamId = index + 1
    mapping(address token => bool) public isTeamToken;

    uint256 public currentSeason;
    uint64 public seasonEndsAt;
    uint64 public seasonDuration;
    uint64 public cooldown;
    uint256 public skipCooldownCost;
    uint256 public protectCost;

    mapping(uint256 season => mapping(uint256 word => uint256)) private _pixels;
    mapping(uint256 season => mapping(uint256 index => uint64)) public protectedUntil;
    mapping(uint256 season => uint32[16]) private _teamPixels;
    mapping(uint256 season => uint8) public seasonWinner;
    mapping(address painter => uint64) public nextPlaceAt;

    // ---------------------------------------------------------------- events

    event PixelPlaced(
        uint256 indexed season,
        uint256 x,
        uint256 y,
        uint8 color,
        uint8 indexed teamId,
        address indexed painter,
        bool boosted
    );
    event PixelProtected(uint256 indexed season, uint256 x, uint256 y, uint64 until, address indexed by);
    event SeasonStarted(uint256 indexed season, uint64 endsAt);
    event SeasonEnded(uint256 indexed season, uint8 winningTeam);
    event TeamAdded(uint8 indexed teamId, address indexed token, uint96 minShares, string ticker);
    event TeamMinSharesUpdated(uint8 indexed teamId, uint96 minShares);
    event CooldownUpdated(uint64 cooldown);
    event SeasonDurationUpdated(uint64 duration);
    event CostsUpdated(uint256 skipCooldownCost, uint256 protectCost);

    // ---------------------------------------------------------------- errors

    error OutOfBounds();
    error InvalidColor();
    error InvalidTeam();
    error NotAHolder(uint8 teamId);
    error CooldownActive(uint64 readyAt);
    error PixelIsProtected(uint64 until);
    error AlreadyProtected(uint64 until);
    error EmptyPixel();
    error SeasonNotOver();
    error TooManyTeams();
    error DuplicateTeam();
    error InvalidTicker();
    error ZeroAddress();
    error OutOfRange();
    error CostAboveMax(uint256 cost, uint256 maxCost);
    error NotAToken();

    // ---------------------------------------------------------------- setup

    constructor(
        address initialOwner,
        ERC20Burnable placeToken_,
        uint64 seasonDuration_,
        uint64 cooldown_,
        uint256 skipCooldownCost_,
        uint256 protectCost_
    ) Ownable(initialOwner) {
        if (address(placeToken_) == address(0)) revert ZeroAddress();
        placeToken = placeToken_;
        _setSeasonDuration(seasonDuration_);
        _setCooldown(cooldown_);
        _setCosts(skipCooldownCost_, protectCost_);
        _startSeason(1);
    }

    // ---------------------------------------------------------------- painting

    /// @notice Paint one pixel for a team you hold. Subject to the per-wallet cooldown.
    function place(uint256 x, uint256 y, uint8 color, uint8 teamId) external {
        _place(x, y, color, teamId, false);
    }

    /// @notice Paint immediately, ignoring the cooldown, by burning `skipCooldownCost` $PLACE.
    /// @param maxCost Reverts if the current cost is higher (protects against cost changes).
    function placeBoosted(uint256 x, uint256 y, uint8 color, uint8 teamId, uint256 maxCost) external {
        _burn(skipCooldownCost, maxCost);
        _place(x, y, color, teamId, true);
    }

    /// @notice Lock a pixel for `PROTECT_DURATION` by burning `protectCost` $PLACE.
    ///         You must hold the stock of the team that currently owns the pixel.
    /// @param maxCost Reverts if the current cost is higher (protects against cost changes).
    function protect(uint256 x, uint256 y, uint256 maxCost) external {
        _rollSeasonIfEnded();
        uint256 index = _index(x, y);
        uint256 season = currentSeason;

        uint8 teamId = _readPixel(season, index) >> 4;
        if (teamId == 0) revert EmptyPixel();
        _requireHolder(msg.sender, teamId);

        uint64 until = protectedUntil[season][index];
        if (until > block.timestamp) revert AlreadyProtected(until);

        until = uint64(block.timestamp) + PROTECT_DURATION;
        protectedUntil[season][index] = until;
        _burn(protectCost, maxCost);

        emit PixelProtected(season, x, y, until, msg.sender);
    }

    /// @notice Close an expired season and open the next one. Anyone may call.
    function rollSeason() external {
        if (block.timestamp < seasonEndsAt) revert SeasonNotOver();
        _rollSeasonIfEnded();
    }

    // ---------------------------------------------------------------- admin

    function addTeam(address token, uint96 minShares, string calldata ticker) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (_teams.length >= MAX_TEAMS) revert TooManyTeams();
        if (isTeamToken[token]) revert DuplicateTeam();
        if (minShares > MAX_MIN_SHARES) revert OutOfRange();
        _validateTicker(ticker);
        if (token.code.length == 0) revert NotAToken();
        IStockToken(token).balanceOf(address(this)); // must behave like an ERC-20

        isTeamToken[token] = true;
        _teams.push(Team({token: token, minShares: minShares, ticker: ticker}));
        emit TeamAdded(uint8(_teams.length), token, minShares, ticker);
    }

    function setTeamMinShares(uint8 teamId, uint96 minShares) external onlyOwner {
        if (minShares > MAX_MIN_SHARES) revert OutOfRange();
        _team(teamId).minShares = minShares;
        emit TeamMinSharesUpdated(teamId, minShares);
    }

    function setCooldown(uint64 cooldown_) external onlyOwner {
        _setCooldown(cooldown_);
    }

    /// @dev Takes effect from the next season.
    function setSeasonDuration(uint64 duration) external onlyOwner {
        _setSeasonDuration(duration);
    }

    function setCosts(uint256 skipCooldownCost_, uint256 protectCost_) external onlyOwner {
        _setCosts(skipCooldownCost_, protectCost_);
    }

    // ---------------------------------------------------------------- views

    /// @notice The full canvas for a season: `PIXELS` bytes, row-major, (team << 4) | color.
    function getCanvas(uint256 season) external view returns (bytes memory canvas) {
        canvas = new bytes(WORDS * 32);
        for (uint256 w; w < WORDS; ++w) {
            uint256 word = _pixels[season][w];
            assembly ("memory-safe") {
                mstore(add(add(canvas, 0x20), mul(w, 0x20)), word)
            }
        }
        uint256 length = PIXELS;
        assembly ("memory-safe") {
            mstore(canvas, length)
        }
    }

    function getPixel(uint256 season, uint256 x, uint256 y) external view returns (uint8 teamId, uint8 color) {
        uint8 value = _readPixel(season, _index(x, y));
        return (value >> 4, value & 0x0f);
    }

    /// @notice Pixel count per team id (index 0 is unused).
    function teamPixels(uint256 season) external view returns (uint32[16] memory) {
        return _teamPixels[season];
    }

    function teamCount() external view returns (uint256) {
        return _teams.length;
    }

    function getTeam(uint8 teamId) external view returns (address token, uint96 minShares, string memory ticker) {
        Team storage t = _team(teamId);
        return (t.token, t.minShares, t.ticker);
    }

    function teamTicker(uint8 teamId) external view returns (string memory) {
        if (teamId == 0) return "";
        return _team(teamId).ticker;
    }

    /// @notice Share-equivalent holding of `account` in a team's stock (ERC-8056 adjusted).
    function sharesOf(address account, uint8 teamId) public view returns (uint256) {
        address token = _team(teamId).token;
        uint256 balance = IStockToken(token).balanceOf(account);
        return Math.mulDiv(balance, _multiplier(token), MULTIPLIER_ONE);
    }

    function isHolder(address account, uint8 teamId) public view returns (bool) {
        uint256 shares = sharesOf(account, teamId);
        return shares > 0 && shares >= _team(teamId).minShares;
    }

    /// @notice The team currently holding the most pixels this season (0 if none).
    function leader() external view returns (uint8) {
        return _leader(currentSeason);
    }

    // ---------------------------------------------------------------- internals

    function _place(uint256 x, uint256 y, uint8 color, uint8 teamId, bool boosted) private {
        _rollSeasonIfEnded();
        uint256 index = _index(x, y);
        if (color >= COLORS) revert InvalidColor();
        _requireHolder(msg.sender, teamId);

        uint64 readyAt = nextPlaceAt[msg.sender];
        if (!boosted && block.timestamp < readyAt) revert CooldownActive(readyAt);
        nextPlaceAt[msg.sender] = uint64(block.timestamp) + cooldown;

        uint256 season = currentSeason;
        uint64 until = protectedUntil[season][index];
        if (until > block.timestamp) revert PixelIsProtected(until);

        uint8 previousTeam = _readPixel(season, index) >> 4;
        if (previousTeam != 0) --_teamPixels[season][previousTeam];
        ++_teamPixels[season][teamId];
        _writePixel(season, index, (teamId << 4) | color);

        emit PixelPlaced(season, x, y, color, teamId, msg.sender, boosted);
    }

    function _rollSeasonIfEnded() private {
        if (block.timestamp < seasonEndsAt) return;
        uint256 ended = currentSeason;
        uint8 winner = _leader(ended);
        seasonWinner[ended] = winner;
        emit SeasonEnded(ended, winner);
        _startSeason(ended + 1);
    }

    /// @dev Seasons keep a fixed cadence from the previous end; if several were skipped, the
    ///      new one runs a full duration from now.
    function _startSeason(uint256 season) private {
        currentSeason = season;
        uint64 endsAt = seasonEndsAt + seasonDuration;
        if (endsAt <= block.timestamp) endsAt = uint64(block.timestamp) + seasonDuration;
        seasonEndsAt = endsAt;
        emit SeasonStarted(season, endsAt);
    }

    function _leader(uint256 season) private view returns (uint8 best) {
        uint32[16] storage counts = _teamPixels[season];
        uint32 bestCount;
        uint256 n = _teams.length;
        for (uint256 i = 1; i <= n; ++i) {
            if (counts[i] > bestCount) {
                bestCount = counts[i];
                best = uint8(i);
            }
        }
    }

    function _requireHolder(address account, uint8 teamId) private view {
        if (!isHolder(account, teamId)) revert NotAHolder(teamId);
    }

    function _team(uint8 teamId) private view returns (Team storage) {
        if (teamId == 0 || teamId > _teams.length) revert InvalidTeam();
        return _teams[teamId - 1];
    }

    /// @dev ERC-8056 multiplier. Tokens that predate the standard (call fails or returns no
    ///      word) count as 1:1, as do nonsensical values (0 or absurdly large).
    function _multiplier(address token) private view returns (uint256) {
        (bool ok, bytes memory data) = token.staticcall(abi.encodeCall(IStockToken.uiMultiplier, ()));
        if (!ok || data.length < 32) return MULTIPLIER_ONE;
        uint256 m = abi.decode(data, (uint256));
        return m == 0 || m > MAX_MULTIPLIER ? MULTIPLIER_ONE : m;
    }

    function _burn(uint256 cost, uint256 maxCost) private {
        if (cost > maxCost) revert CostAboveMax(cost, maxCost);
        if (cost != 0) placeToken.burnFrom(msg.sender, cost);
    }

    /// @dev 1..10 bytes of A-Z, 0-9, '.' or '-' (also keeps metadata JSON safe).
    function _validateTicker(string calldata ticker) private pure {
        bytes calldata b = bytes(ticker);
        if (b.length == 0 || b.length > MAX_TICKER_LENGTH) revert InvalidTicker();
        for (uint256 i; i < b.length; ++i) {
            bytes1 c = b[i];
            bool ok = (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c == "." || c == "-";
            if (!ok) revert InvalidTicker();
        }
    }

    function _index(uint256 x, uint256 y) private pure returns (uint256) {
        if (x >= SIZE || y >= SIZE) revert OutOfBounds();
        return y * SIZE + x;
    }

    function _readPixel(uint256 season, uint256 index) private view returns (uint8) {
        uint256 shift = (31 - (index & 31)) * 8;
        return uint8(_pixels[season][index >> 5] >> shift);
    }

    function _writePixel(uint256 season, uint256 index, uint8 value) private {
        uint256 shift = (31 - (index & 31)) * 8;
        uint256 word = _pixels[season][index >> 5];
        word = (word & ~(uint256(0xff) << shift)) | (uint256(value) << shift);
        _pixels[season][index >> 5] = word;
    }

    function _setCooldown(uint64 cooldown_) private {
        if (cooldown_ < MIN_COOLDOWN || cooldown_ > MAX_COOLDOWN) revert OutOfRange();
        cooldown = cooldown_;
        emit CooldownUpdated(cooldown_);
    }

    function _setSeasonDuration(uint64 duration) private {
        if (duration < MIN_SEASON || duration > MAX_SEASON) revert OutOfRange();
        seasonDuration = duration;
        emit SeasonDurationUpdated(duration);
    }

    function _setCosts(uint256 skipCooldownCost_, uint256 protectCost_) private {
        if (skipCooldownCost_ > MAX_COST || protectCost_ > MAX_COST) revert OutOfRange();
        skipCooldownCost = skipCooldownCost_;
        protectCost = protectCost_;
        emit CostsUpdated(skipCooldownCost_, protectCost_);
    }
}
