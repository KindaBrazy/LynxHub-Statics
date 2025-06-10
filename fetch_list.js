import {dirname, join} from "node:path";
import {writeFileSync, readFileSync} from "node:fs";
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const paths = {
    modules: join(__dirname, 'modules.json'),
    extensions: join(__dirname, 'extensions.json'),
    earlyAccessExtensions: join(__dirname, 'extensions_ea.json'),
};


async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}


async function processAndCompileJson(path, type) {
    try {
        const urls = JSON.parse(readFileSync(path, 'utf8'));
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
        writeFileSync(path, JSON.stringify(compiledData, null, 2));
        console.log(`Successfully compiled ${type}s to ${path}`);
    } catch (error) {
        console.error(`Failed to process and compile ${type}s from ${path}: ${error.message}`);
    }
}

async function compileAllJsons() {
    console.log('Starting JSON compilation...');

    await processAndCompileJson(paths.modules, 'module');
    await processAndCompileJson(paths.extensions, 'extension');
    await processAndCompileJson(paths.earlyAccessExtensions, 'early access extension');

    console.log('JSON compilation complete!');
}

compileAllJsons();