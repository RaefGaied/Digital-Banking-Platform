#!/usr/bin/env python3
import json

with open('postman_collection.json', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"raw": "http://localhost:8080', '"raw": "{{baseUrl}}')

with open('postman_collection.json', 'w', encoding='utf-8') as f:
    f.write(content)

print('✓ Updated postman_collection.json - all URLs now use {{baseUrl}}')
