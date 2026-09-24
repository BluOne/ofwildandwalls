# OF Wild & Walls Admin — Express + EJS + Tailwind

Admin panel for the photography portfolio: photo data table, add/edit photo form with
dynamic metadata fields, and categories (table + right-hand edit form + add modal).

## Run

```bash
cd admin-express
npm install
npm start          # http://localhost:3001/admin/photos
```

Thumbnails read from `/img/...`. Copy your site's images in:

```bash
cp -r ../public/img public/img
```

## Structure

```
server.js               routes + in-memory store (swap for your DB)
data/photos.js          photo records, each with an ordered meta[] array
data/categories.js      { title, parent, description }
views/photos.ejs        data table: photo, caption, slug, category, collection,
                        camera, date, live toggle, actions; sortable, searchable
views/photo-form.ejs    add + edit (same view, mode flag)
views/categories.ejs    category table + edit form + new-category modal
views/partials/         head (Tailwind config), header (search), sidebar, footer
public/js/admin.js      sort, search, metadata rows, modal, pill toggles, confirms
```

## Routes

| Method | Path | Does |
| --- | --- | --- |
| GET | `/admin/photos` | listing |
| GET | `/admin/photos/new` | add form |
| GET | `/admin/photos/:slug/edit` | edit form |
| POST | `/admin/photos` | create |
| POST | `/admin/photos/:slug` | update |
| POST | `/admin/photos/:slug/toggle` | live / draft |
| POST | `/admin/photos/:slug/delete` | delete |
| GET | `/admin/categories?sel=n` | table + edit form for row `n` |
| POST | `/admin/categories` | create (modal) |
| POST | `/admin/categories/:index` | update |
| POST | `/admin/categories/:index/delete` | delete |

## Notes

- Tailwind runs from the CDN with the theme in `views/partials/head.ejs`
  (pine `#1b2a27`, amber `#c98b3a`, cream `#f4f1ec`). For production, compile
  Tailwind and link the built stylesheet instead.
- Metadata rows post as parallel `meta_key[]` / `meta_value[]` arrays and are
  zipped back into `meta` in `server.js`.
- File inputs are present but uploads are not wired — add `multer` and write to
  `public/img`, then set `src` on the record.
- Data is in memory, so edits reset on restart. Point `data/*.js` at your store.
