import json
import os
import pathlib
import requests
import sys

SCRIPT_DIR = pathlib.Path(__file__).parent
LIST_FILE = SCRIPT_DIR.parent / 'plugins.json'
OUTPUT_DIR = os.environ.get('OUTPUT_DIR', 'plugins')
METADATA_BRANCH = 'metadata'
REQUIRED_FILES = ['metadata.json', 'versioning.json', 'icon.png']
PLUGIN_MAP_FILE = 'plugins_url.json'

def main():
    print("--- Starting Plugin Metadata Sync ---")

    output_path = pathlib.Path(OUTPUT_DIR)
    print(f"Ensuring output directory '{output_path.resolve()}' exists...")
    output_path.mkdir(exist_ok=True)

    plugin_repo_map = {}

    try:
        with open(LIST_FILE, 'r') as f:
            repo_urls = set(json.load(f))
    except FileNotFoundError:
        print(f"❌ FATAL ERROR: The source file '{LIST_FILE}' was not found.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"❌ FATAL ERROR: Could not decode JSON from '{LIST_FILE}'. Please check its format.")
        sys.exit(1)

    print(f"Found {len(repo_urls)} unique repositories to process from '{LIST_FILE}'.")

    for repo_url in repo_urls:
        print(f"\n--- Processing: {repo_url} ---")
        try:
            parts = repo_url.strip('/').split('/')
            if len(parts) < 2:
                print(f"⚠️ Warning: Could not parse owner/repo from URL '{repo_url}'. Skipping.")
                continue
            owner, repo = parts[-2], parts[-1]

            metadata_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{METADATA_BRANCH}/metadata.json"
            print(f"Fetching metadata from: {metadata_url}")
            response = requests.get(metadata_url, timeout=15)
            response.raise_for_status()
            metadata = response.json()

            plugin_id = metadata.get('id')
            if not plugin_id:
                print(f"❌ Error: 'id' key not found in metadata.json for {repo_url}. Skipping.")
                continue

            print(f"Plugin ID found: '{plugin_id}'")

            plugin_dir = output_path / plugin_id
            plugin_dir.mkdir(exist_ok=True)

            for filename in REQUIRED_FILES:
                file_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{METADATA_BRANCH}/{filename}"
                print(f"Downloading {filename}...")
                file_response = requests.get(file_url, timeout=15)
                file_response.raise_for_status()

                with open(plugin_dir / filename, 'wb') as f:
                    f.write(file_response.content)

            print(f"✅ Successfully processed and saved files for '{plugin_id}'.")

            plugin_repo_map[plugin_id] = repo_url

        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching data for {repo_url}: {e}. Skipping.")
        except Exception as e:
            print(f"❌ An unexpected error occurred while processing {repo_url}: {e}. Skipping.")

    map_file_path = output_path / PLUGIN_MAP_FILE
    print(f"\n--- Writing repository map to '{map_file_path.resolve()}' ---")
    try:
        with open(map_file_path, 'w') as f:
            json.dump(plugin_repo_map, f, indent=4)
        print("✅ Successfully wrote plugin repository map.")
    except Exception as e:
        print(f"❌ FATAL ERROR: Could not write repository map file: {e}")

    print("\n--- Plugin Metadata Sync Finished ---")

if __name__ == "__main__":
    main()