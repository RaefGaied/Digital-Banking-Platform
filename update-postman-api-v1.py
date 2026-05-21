#!/usr/bin/env python3
import json
from pathlib import Path

collection_path = Path('postman_collection.json')

with collection_path.open('r', encoding='utf-8') as f:
    collection = json.load(f)


def update_item(item):
    request = item.get('request')
    if request:
        url = request.get('url', {})
        raw = url.get('raw')
        if isinstance(raw, str):
            raw = raw.replace('{{baseUrl}}', 'http://localhost:8080/api/v1')
            if raw.startswith('http://localhost:8080/') and not raw.startswith('http://localhost:8080/api/v1/'):
                raw = raw.replace('http://localhost:8080/', 'http://localhost:8080/api/v1/', 1)
            url['raw'] = raw

        path = url.get('path')
        if isinstance(path, list) and path:
            if path[0] != 'api':
                url['path'] = ['api', 'v1'] + path

        request['url'] = url

    for child in item.get('item', []):
        update_item(child)


for top_level_item in collection.get('item', []):
    update_item(top_level_item)

collection.setdefault('variable', [])
for variable in collection['variable']:
    if variable.get('key') == 'baseUrl':
        variable['value'] = 'http://localhost:8080/api/v1'

with collection_path.open('w', encoding='utf-8') as f:
    json.dump(collection, f, ensure_ascii=False, indent=2)
    f.write('\n')

print('Updated Postman collection to use /api/v1 base path')
