const PHOTOS = [
  {
    what: 'New York Stock Exchange (hero, trading floor)',
    who: 'Arild Vågen',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:New_York_Stock_Exchange_August_2017_02.jpg',
  },
  {
    what: 'NYSE tower',
    who: 'Arild Vågen',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:New_York_Stock_Exchange_August_2017_04.jpg',
  },
  {
    what: 'Wall St sign',
    who: 'Alex Proimos',
    license: 'CC BY 2.0',
    url: 'https://commons.wikimedia.org/wiki/File:Wall_Street_Sign_(5899884048).jpg',
  },
  {
    what: 'NYSE flag facade',
    who: 'Dietmar Rabich',
    license: 'CC BY-SA 4.0',
    url: 'https://commons.wikimedia.org/wiki/File:New_York_City_(New_York,_USA),_Wall_Street_--_2012_--_6614.jpg',
  },
]

export function Credits({ canvasLink }: { canvasLink: string | null }) {
  return (
    <footer className="credits">
      <div className="credits-big" aria-hidden="true">Take the street.</div>
      <div className="credits-cols">
        <div>
          <h3>Wall Street Place</h3>
          <p>Your stock tokens are only read, never moved. $PLACE is only ever burned.</p>
          <p>
            {canvasLink && (
              <>
                <a href={canvasLink} target="_blank" rel="noreferrer">Canvas contract</a>
                {' · '}
              </>
            )}
            <a href="https://github.com/JustSteez/wall-street-place" target="_blank" rel="noreferrer">Source on GitHub</a>
          </p>
        </div>
        <div>
          <h3>Photo credits</h3>
          <ul>
            {PHOTOS.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noreferrer">{p.what}</a> — {p.who}, {p.license}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="credits-fine">An experiment on Robinhood Chain. Not affiliated with Robinhood or the NYSE. Not financial advice.</p>
    </footer>
  )
}
