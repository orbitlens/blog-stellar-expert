const fs = require('fs'),
    path = require('path')

function validateMeta(meta, entry) {
    if (!meta.title) throw new Error(`Invalid "${entry}" meta format - "title" is missing`)
    if (!meta.date) throw new Error(`Invalid "${entry}" meta format - "date" is missing `)
    if (!meta.description) throw new Error(`Invalid "${entry}" meta format - "description" is missing`)
    //if (!meta.imageTwitter) throw new Error(`Invalid "${entry}" meta format - missing title`)
    //if (!meta.imageFb) throw new Error(`Invalid "${entry}" meta format - missing title`)
}

function findPosts() {
    const res = [],
        cwd = path.join(__dirname, '/posts')

    const dirContents = fs.readdirSync(cwd)

    for (const entry of dirContents) {
        const postPath = path.join(cwd, entry),
            stat = fs.statSync(postPath)

        if (stat && stat.isDirectory()) {
            const markdown = fs.readFileSync(path.join(postPath, 'index.md'), 'utf-8'),
                [, header] = /^---\s+(.+?)\s+---/s.exec(markdown),
                metaPairs = header.split('\n'),
                meta = {}

            for (const line of metaPairs) {
                const [prop, value] = line.split(':', 2)
                meta[prop.trim()] = value.trim()
            }
            if (meta.hidden === 'true') continue
            validateMeta(meta, entry)
            meta.id = entry
            res.push(meta)
        }
    }

    return res
}

function buildIndex() {
    const posts = findPosts()
    posts.sort((a, b) => {
        if (a.date < b.date) return 1
        if (a.date > b.date) return -1
        return 0
    })
    const index = posts.map(post => post.id),
        indexFile = path.join(__dirname, '/index.json')
    fs.writeFileSync(indexFile, JSON.stringify(index, null, '  '), 'utf-8')
    console.log(`Index ${indexFile} – build finished`)
}

buildIndex()