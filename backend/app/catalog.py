"""Server-held, versioned pricing snapshot exported from the original frontend catalogue."""
import json
from pathlib import Path
CATALOG = {item['id']: item for item in json.loads((Path(__file__).parent / 'sevas.json').read_text(encoding='utf-8'))}
