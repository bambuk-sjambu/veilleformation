#!/bin/bash
# Script de correction des accents français

cd /media/stef/Photos\ -\ Sauv/DEV-JAMBU/veillereglementaire/frontend/src

# Corrections courantes
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  -e "s/mis a jour/mis à jour/g" \
  -e "s/a jour/à jour/g" \
  -e "s/creation/création/g" \
  -e "s/modification/modification/g" \
  -e "s/suppression/suppression/g" \
  -e "s/erreur/erreur/g" \
  -e "s/caracteres/caractères/g" \
  -e "s/equipe/équipe/g" \
  -e "s/preference/préférence/g" \
  -e "s/parametre/paramètre/g" \
  -e "s/alerte/alerte/g" \
  -e "s/utilisateur/utilisateur/g" \
  -e "s/personnalise/personnalisé/g" \
  -e "s/illimite/illimité/g" \
  -e "s/theme/thème/g" \
  -e "s/connexion/connexion/g" \
  -e "s/inscription/inscription/g" \
  -e "s/activation/activation/g" \
  -e "s/registration/enregistrement/g" \
  -e "s/premiere/première/g" \
  -e "s/apres/après/g" \
  -e "s/appraitront/apparaîtront/g" \
  -e "s/etoile/étoile/g" \
  -e "s/favori/favori/g"

echo "Accents corrigés!"
