# Configuration PythonAnywhere

## 1. Pre-requis

1. Creer un compte PythonAnywhere (gratuit ou payant)
2. Cloner le repository:
   ```bash
   git clone https://github.com/bambuk-sjambu/cipia.git
   cd cipia
   ```

3. Creer un virtualenv et installer les dependances:
   ```bash
   python3.12 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

4. Configurer les variables d'environnement dans `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   BREVO_API_KEY=xkeysib-...
   ADMIN_EMAIL=votre@email.com
   ```

## 2. Configuration des Scheduled Tasks

Aller dans **Tasks** tab sur PythonAnywhere et ajouter:

| Heure (UTC) | Jour | Description |
|-------------|------|-------------|
| 05:00 | Tous | Collecte matin (6h Paris) |
| 17:00 | Tous | Collecte soir (18h Paris) |
| 07:00 | Mardi | Newsletter hebdo (8h Paris) |
| 17:00 | Jeudi | Stats newsletter |

## 3. Scripts Cron

Creer les scripts suivants dans `/home/username/cipia/cron/`:

### cron_collect.sh
```bash
#!/bin/bash
cd /home/username/cipia
source .venv/bin/activate
python main.py collect >> logs/cron_collect.log 2>&1
```

### cron_newsletter.sh
```bash
#!/bin/bash
cd /home/username/cipia
source .venv/bin/activate
python main.py newsletter >> logs/cron_newsletter.log 2>&1
```

### cron_stats.sh
```bash
#!/bin/bash
cd /home/username/cipia
source .venv/bin/activate
python main.py status >> logs/cron_stats.log 2>&1
```

## 4. Commandes PythonAnywhere

Dans le champ "Command" des Scheduled Tasks:

| Task | Command |
|------|---------|
| Collecte matin (05:00 UTC) | `/home/username/cipia/cron/cron_collect.sh` |
| Collecte soir (17:00 UTC) | `/home/username/cipia/cron/cron_collect.sh` |
| Newsletter (07:00 UTC mardi) | `/home/username/cipia/cron/cron_newsletter.sh` |
| Stats (17:00 UTC jeudi) | `/home/username/cipia/cron/cron_stats.sh` |

## 5. Monitoring

- Consulter les logs dans `/home/username/cipia/logs/`
- Configurer les alertes email via le module monitoring
- Verifier la sante du systeme: `python main.py status`

## Notes

- Le compte gratuit PythonAnywhere a des limitations (CPU, nombre de tasks)
- Pour un usage production, utiliser un compte payant (~5$/mois)
- Ajuster les heures UTC selon le fuseau horaire desire (Paris = UTC+1)
