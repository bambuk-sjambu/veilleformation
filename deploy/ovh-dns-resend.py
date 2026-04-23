#!/usr/bin/env python3
"""Add Resend DNS records (DKIM + SPF + DMARC) to cipia.fr via OVH API."""

import os
import sys

sys.path.insert(0, "deploy")
from importlib.util import module_from_spec, spec_from_file_location

spec = spec_from_file_location("ovh", "deploy/ovh-dns-setup.py")
ovh_mod = module_from_spec(spec)
spec.loader.exec_module(ovh_mod)

DOMAIN = "cipia.fr"

RECORDS = [
    # DKIM — prefix v=DKIM1; k=rsa; is required for a valid DKIM record
    {
        "fieldType": "TXT",
        "subDomain": "resend._domainkey",
        "target": "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLJS2ts788L8A7pMTfLpJXOhMCRQLBT4G6pfE/Bb5W/aZNlRLa7s42hTEau2XSiqB/ftIRm5PX5Zr4DepvIpuDe2nYDF0Nz3Lm4hS/2q+h0J6Ost56fbLlbLSGL0Ckk8Fqz0hr3CF/vCBPqR/nh2C1iifRyHoYyGur8psPIiK7MQIDAQAB",
        "ttl": 3600,
    },
    # SPF TXT pour le sous-domaine send
    {
        "fieldType": "TXT",
        "subDomain": "send",
        "target": "v=spf1 include:amazonses.com ~all",
        "ttl": 3600,
    },
    # MX pour bounces/feedback (subdomain send)
    {
        "fieldType": "MX",
        "subDomain": "send",
        "target": "10 feedback-smtp.ap-northeast-1.amazonses.com.",
        "ttl": 3600,
    },
    # DMARC
    {
        "fieldType": "TXT",
        "subDomain": "_dmarc",
        "target": "v=DMARC1; p=none;",
        "ttl": 3600,
    },
]


def main():
    o = ovh_mod.OVHClient(
        os.environ["OVH_APP_KEY"],
        os.environ["OVH_APP_SECRET"],
        os.environ["OVH_CONSUMER_KEY"],
    )

    existing_ids = o._call("GET", f"/domain/zone/{DOMAIN}/record")
    existing = []
    for rid in existing_ids:
        r = o._call("GET", f"/domain/zone/{DOMAIN}/record/{rid}")
        existing.append((rid, r["fieldType"], r["subDomain"], r["target"]))

    print("[1/3] Nettoyage records resend existants...")
    for rid, ft, sd, tgt in existing:
        if sd in ("resend._domainkey", "send", "_dmarc") and ft in ("TXT", "MX"):
            print(f"  Suppression {rid}: {ft} {sd} -> {tgt[:50]}...")
            o._call("DELETE", f"/domain/zone/{DOMAIN}/record/{rid}")

    print("[2/3] Creation des 4 records Resend...")
    for rec in RECORDS:
        result = o._call("POST", f"/domain/zone/{DOMAIN}/record", body=rec)
        label = rec["subDomain"] or "@"
        print(f"  OK {rec['fieldType']:4} {label:22} -> {rec['target'][:60]}{'...' if len(rec['target']) > 60 else ''} (id {result['id']})")

    print("[3/3] Publication zone...")
    o._call("POST", f"/domain/zone/{DOMAIN}/refresh")
    print("  Zone rechargee.")
    print()
    print("  Propagation 5-30 min. Verifie sur https://resend.com/domains quand cipia.fr est 'Verified'.")


if __name__ == "__main__":
    main()
