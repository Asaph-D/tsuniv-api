#!/bin/bash

# Capture la branche active
BRANCH=$(git branch --show-current)

echo "📦 Branche active détectée : $BRANCH"
echo "⚠️ Ce script va rebaser (optionnel), merger dans main, lancer les tests et pousser."

read -p "❓ Continuer avec cette branche ? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "❌ Opération annulée."
  exit 0
fi

# Sauvegarde de l'état actuel
echo "📥 Sauvegarde de l'état actuel avec git stash"
git stash push -m "Pré-sync $BRANCH"

read -p "🔄 Souhaitez-vous faire un rebase sur main ? (y/n): " REBASE
if [ "$REBASE" == "y" ]; then
  git fetch origin main
  if ! git rebase origin/main; then
    echo "❌ Rebase échoué. Restauration de l'état précédent..."
    git rebase --abort
    git stash pop
    exit 1
  fi
  echo "✅ Rebase terminé"
else
  echo "⏩ Rebase ignoré"
fi

echo "📦 Basculer sur main"
git checkout main || {
  echo "❌ Échec du checkout vers main. Restauration..."
  git stash pop
  exit 1
}

echo "📥 Pull des dernières modifications"
git pull origin main

read -p "🔀 Confirmer le merge de $BRANCH dans main ? (y/n): " MERGE_CONFIRM
if [ "$MERGE_CONFIRM" != "y" ]; then
  echo "❌ Merge annulé. Restauration..."
  git stash pop
  exit 0
fi

if ! git merge $BRANCH --no-ff; then
  echo "❌ Merge échoué. Restauration de l'état précédent..."
  git merge --abort
  git stash pop
  exit 1
fi

echo "🧪 Lancement des tests"
npm run test && npm run test:e2e

read -p "🚀 Pusher vers origin/main ? (y/n): " PUSH_CONFIRM
if [ "$PUSH_CONFIRM" != "y" ]; then
  echo "❌ Push annulé. Restauration..."
  git stash pop
  exit 0
fi

git push origin main
echo "✅ Fusion terminée avec succès"

# Nettoyage du stash si tout s’est bien passé
git stash drop stash@{0}
