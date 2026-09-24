# Of Wild & Walls

Two pages, built to match the screenshots exactly.

- **Flow** (`/`) — photos scattered on a scrolling canvas.
- **Grid** (`/grid`) — one horizontal filmstrip, photos at their own aspect ratio, scrolls sideways.

Both share the top bar (Dark Mode / title / Flow · Grid) and the floating bottom bar
(Category · Collections · Camera · Lens). On the grid page the Camera menu is open, as in the design.

## Files

    views/partials/head.ejs    doctype, fonts, Tailwind CDN + config, <body> open
    views/partials/header.ejs  top bar — takes view: 'flow' | 'grid'
    views/partials/footer.ejs  bottom bar + camera menu — takes cameras, cameraOpen
    views/index.ejs            flow view
    views/grid.ejs             grid view
    public/js/app.js           dark mode, camera menu, bottom bar, sideways wheel scroll
    public/data/photos.js      photo list + flow positions
    public/data/cameras.js     camera menu data
    public/img/*.jpg           photos cropped from the screenshots — replace with originals
    preview/index.html         static previews, open directly in a browser
    preview/grid.html

## Express

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));

    const photos  = require('./public/data/photos');
    const cameras = require('./public/data/cameras');

    app.get('/',     (req, res) => res.render('index', { title: 'Of Wild & Walls', photos, cameras }));
    app.get('/grid', (req, res) => res.render('grid',  { title: 'Of Wild & Walls', photos, cameras }));

## Layout

**Flow** — each photo is absolutely positioned on a canvas sized in `vw`, so the composition
scales with the window and keeps the exact spacing of the design.

    type Photo = { src: string; alt: string; l: number; t: number; w: number; h: number };
    // l/t/w/h are vw units

Raise `height:73.2vw` on `#flowCanvas` when you add rows.

**Grid** — a flex row inside `#gridStrip`. Every photo is `43.3vh` tall with `width:auto`, so
each keeps its own proportions and the row runs off the right edge. Gap is 14px.

## Images

`public/img/*.jpg` are crops from the screenshots, so they are low resolution — the grid page
shows them large and it is visible. Drop the originals in with the same filenames and nothing
else changes.
