#!/usr/bin/env python3
"""OVH DNS Setup for Cipia.fr.

Configure les enregistrements DNS chez OVH pour pointer cipia.fr vers le VPS Hetzner.

Usage:
    export OVH_APP_KEY="..."
    export OVH_APP_SECRET="..."
    export OVH_CONSUMER_KEY="..."
    python deploy/ovh-dns-setup.py
"""

import hashlib
import json
import os
import sys
import time
from urllib import request, error

DOMAIN = "cipia.fr"
TARGET_IP = "5.223.72.40"
OVH_API = "https://eu.api.ovh.com/1.0"


class OVHClient:
    def __init__(self, app_key, app_secret, consumer_key):
        self.app_key = app_key
        self.app_secret = app_secret
        self.consumer_key = consumer_key
        self.time_delta = self._get_time_delta()

    def _get_time_delta(self):
        with request.urlopen(f"{OVH_API}/auth/time") as r:
            server_time = int(r.read().decode())
        return server_time - int(time.time())

    def _call(self, method, path, body=None):
        url = f"{OVH_API}{path}"
        body_str = json.dumps(body) if body is not None else ""
        timestamp = str(int(time.time()) + self.time_delta)
        signature = "$1$" + hashlib.sha1(
            "+".join([self.app_secret, self.consumer_key, method, url, body_str, timestamp]).encode()
        ).hexdigest()

        req = request.Request(url, method=method)
        req.add_header("X-Ovh-Application", self.app_key)
        req.add_header("X-Ovh-Consumer", self.consumer_key)
        req.add_header("X-Ovh-Timestamp", timestamp)
        req.add_header("X-Ovh-Signature", signature)
        req.add_header("Content-Type", "application/json")

        if body is not None:
            req.data = body_str.encode()

        try:
            with request.urlopen(req) as r:
                data = r.read().decode()
                return json.loads(data) if data else None
        except error.HTTPError as e:
            body = e.read().decode()
            print(f"ERROR {e.code} on {method} {path}: {body}", file=sys.stderr)
            raise


def main():
    app_key = os.environ.get("OVH_APP_KEY")
    app_secret = os.environ.get("OVH_APP_SECRET")
    consumer_key = os.environ.get("OVH_CONSUMER_KEY")

    if not all([app_key, app_secret, consumer_key]):
        print("ERROR: set OVH_APP_KEY, OVH_APP_SECRET, OVH_CONSUMER_KEY", file=sys.stderr)
        sys.exit(1)

    ovh = OVHClient(app_key, app_secret, consumer_key)

    # 1. Lister tous les records existants
    print(f"[1/4] Inspection zone DNS {DOMAIN}...")
    record_ids = ovh._call("GET", f"/domain/zone/{DOMAIN}/record")
    print(f"      {len(record_ids)} records existants")

    # 2. Supprimer les A records a la racine et www (pour repartir propre)
    print("[2/4] Nettoyage A records racine + www...")
    for rid in record_ids:
        record = ovh._call("GET", f"/domain/zone/{DOMAIN}/record/{rid}")
        if record["fieldType"] == "A" and record["subDomain"] in ("", "www"):
            print(f"      Suppression record {rid}: {record['subDomain']} -> {record['target']}")
            ovh._call("DELETE", f"/domain/zone/{DOMAIN}/record/{rid}")

    # 3. Creer les nouveaux A records -> Hetzner
    print(f"[3/4] Creation A records vers {TARGET_IP}...")
    for subdomain in ("", "www"):
        label = subdomain or "@ (racine)"
        result = ovh._call(
            "POST",
            f"/domain/zone/{DOMAIN}/record",
            body={
                "fieldType": "A",
                "subDomain": subdomain,
                "target": TARGET_IP,
                "ttl": 3600,
            },
        )
        print(f"      {label} -> {TARGET_IP} (id {result['id']})")

    # 4. Publier la zone (apply changes)
    print("[4/4] Publication de la zone DNS...")
    ovh._call("POST", f"/domain/zone/{DOMAIN}/refresh")
    print(f"      Zone {DOMAIN} rechargee.")

    print()
    print(f"  DNS configure. Propagation en cours (5-60 min generalement).")
    print(f"  Verifier avec : host {DOMAIN}")
    print(f"  Resultat attendu : {DOMAIN} has address {TARGET_IP}")


if __name__ == "__main__":
    main()
