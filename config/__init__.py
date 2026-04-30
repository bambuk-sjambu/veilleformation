"""Module de configuration secteur (Python).

Le frontend Next.js et le backend Python lisent le meme JSON
depuis `/config/sectors/<sector>.json`, garantissant l'unicite de la
source de verite.
"""

from .loader import load_sector, SectorConfig

__all__ = ["load_sector", "SectorConfig"]
