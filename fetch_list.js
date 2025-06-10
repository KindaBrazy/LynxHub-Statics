import {dirname, join} from "node:path";
import {writeFileSync, readFileSync, existsSync, mkdirSync} from "node:fs";
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const paths = {
    modules: {
        source: join(__dirname, 'modules.json'),
        compiled: join(__dirname, 'compiled', 'modules.json')
    },
    extensions: {
        source: join(__dirname, 'extensions.json'),
        compiled: join(__dirname, 'compiled', 'extensions.json')
    },
    earlyAccessExtensions: {
        source: join(__dirname, 'extensions_ea.json'),
        compiled: join(__dirname, 'compiled', 'extensions_ea.json')
    }
};

const compiledDir = join(__dirname, 'compiled');
if (!existsSync(compiledDir)) {
    mkdirSync(compiledDir, {recursive: true});
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}


async function processAndCompileJson(sourcePath, compiledPath, type) {
    try {
        const urls = JSON.parse(readFileSync(sourcePath, 'utf8'));
        const fetchedData = await Promise.all(
            urls.map(async (url) => {
                try {
                    return await fetchJson(url);
                } catch (error) {
                    console.error(`Error fetching ${type} from ${url}: ${error.message}`);
                    return null;
                }
            })
        );

        const compiledData = fetchedData.filter(data => data !== null);
        writeFileSync(compiledPath, JSON.stringify(compiledData, null, 2));
        console.log(`Successfully compiled ${type}s to ${compiledPath}`);
    } catch (error) {
        console.error(`Failed to process and compile ${type}s from ${sourcePath}: ${error.message}`);
    }
}

async function compileAllJsons() {
    console.log('Starting JSON compilation...');

    await processAndCompileJson(paths.modules.source, paths.modules.compiled, 'module');
    await processAndCompileJson(paths.extensions.source, paths.extensions.compiled, 'extension');
    await processAndCompileJson(paths.earlyAccessExtensions.source, paths.earlyAccessExtensions.compiled, 'early access extension');

    console.log('JSON compilation complete!');
}

compileAllJsons();