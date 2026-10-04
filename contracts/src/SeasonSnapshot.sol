// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IWallStreetPlace} from "./interfaces/IWallStreetPlace.sol";
import {CanvasRenderer} from "./CanvasRenderer.sol";

/// @title SeasonSnapshot
/// @notice Open-edition collectible of a finished Wall Street Place season. Minting burns
///         $PLACE; the artwork is rendered on-chain from the frozen season canvas.
contract SeasonSnapshot is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_MINT_COST = 10_000 ether;

    IWallStreetPlace public immutable canvas;
    ERC20Burnable public immutable placeToken;

    uint256 public mintCost;
    uint256 public totalMinted;
    mapping(uint256 tokenId => uint256) public seasonOf;
    mapping(uint256 season => uint256) public mintedPerSeason;

    event SnapshotMinted(uint256 indexed tokenId, uint256 indexed season, address indexed to);
    event MintCostUpdated(uint256 mintCost);

    error SeasonNotFinished();
    error OutOfRange();
    error CostAboveMax(uint256 cost, uint256 maxCost);

    constructor(address initialOwner, IWallStreetPlace canvas_, ERC20Burnable placeToken_, uint256 mintCost_)
        ERC721("Wall Street Place Season", "WSPS")
        Ownable(initialOwner)
    {
        canvas = canvas_;
        placeToken = placeToken_;
        _setMintCost(mintCost_);
    }

    /// @notice Mint a snapshot of a finished season by burning `mintCost` $PLACE.
    /// @param maxCost Reverts if the current cost is higher (protects against cost changes).
    function mint(uint256 season, uint256 maxCost) external returns (uint256 tokenId) {
        if (season == 0 || season >= canvas.currentSeason()) revert SeasonNotFinished();
        uint256 cost = mintCost;
        if (cost > maxCost) revert CostAboveMax(cost, maxCost);
        if (cost != 0) placeToken.burnFrom(msg.sender, cost);

        tokenId = ++totalMinted;
        seasonOf[tokenId] = season;
        ++mintedPerSeason[season];
        emit SnapshotMinted(tokenId, season, msg.sender);
        _safeMint(msg.sender, tokenId);
    }

    function setMintCost(uint256 mintCost_) external onlyOwner {
        _setMintCost(mintCost_);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        uint256 season = seasonOf[tokenId];
        string memory winner = canvas.teamTicker(canvas.seasonWinner(season));
        if (bytes(winner).length == 0) winner = "None";

        string memory image = Base64.encode(bytes(CanvasRenderer.toSvg(canvas.getCanvas(season))));
        bytes memory json = abi.encodePacked(
            '{"name":"Wall Street Place - Season ',
            season.toString(),
            " #",
            tokenId.toString(),
            '","description":"The final canvas of Wall Street Place season ',
            season.toString(),
            ', painted pixel by pixel by stock holders on Robinhood Chain. Rendered fully on-chain.",',
            '"image":"data:image/svg+xml;base64,',
            image,
            '","attributes":[{"trait_type":"Season","value":',
            season.toString(),
            '},{"trait_type":"Winning Team","value":"',
            winner,
            '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(json));
    }

    /// @notice Preview any season's artwork (including the live one) as an SVG string.
    function previewSvg(uint256 season) external view returns (string memory) {
        return CanvasRenderer.toSvg(canvas.getCanvas(season));
    }

    function _setMintCost(uint256 mintCost_) private {
        if (mintCost_ > MAX_MINT_COST) revert OutOfRange();
        mintCost = mintCost_;
        emit MintCostUpdated(mintCost_);
    }
}
