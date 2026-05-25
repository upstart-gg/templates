Images can be put in 2 places:
- `app/assets/`: for images import'ed in the application code (eg `import img from "~/assets/image.png"`)
- `public/images/`: for images referenced in datasources (e.g. product images) using relative URLs (and refrenced like `<img src={imageUrlFromDb} />` where `imageUrlFromDb` is an absolute path like `/images/image.png`)
