# Audit Claude Code Fork - April 2026

## ✅ Ce qui fonctionne

### CLI de base
- ✅ `bun run dev --version` - Affiche la version
- ✅ `bun run dev --help` - Affiche l'aide complète
- ✅ **Provider Setup Wizard** - Interface TUI pour configurer les providers
- ✅ **React 19 Canary** - Supporte `useEffectEvent`
- ✅ **MACRO System** - VERSION et BUILD_TIME initialisés

### Provider System
- ✅ Configuration multi-provider dans `src/providers/`
- ✅ Support de 5 providers: Anthropic, OpenRouter, OpenAI, Gemini, Ollama
- ✅ Sauvegarde config dans `~/.claude/providers.json`
- ✅ Wrapper du client Anthropic pour router les appels

## ❌ Problèmes actuels

### 1. Modèles Gemini incorrects
**Problème:** Le setup wizard utilise `gemini-3.1-pro` par défaut, mais:
- Clé API free → accès uniquement à `gemini-2.5-flash`
- Les vrais modèles existent: `gemini-3.1-pro`, `gemini-3.1-flash`, etc.
- Mais l'API nécessite peut-être un format différent

**Solution:** 
- Changer le modèle par défaut à `gemini-2.5-flash` pour les clés free
- Ajouter une détection du tier (free vs paid)
- Vérifier le bon format d'URL de l'API Gemini

### 2. Build échoue (bun run build)
**Problème:** Manque beaucoup de dépendances pour le bundling:
- `proper-lockfile`
- `@anthropic-ai/bedrock-sdk`
- `@anthropic-ai/foundry-sdk`
- `@anthropic-ai/vertex-sdk`
- `@aws-sdk/*` packages
- `sharp` (image processing)
- `fflate` (compression)
- `vscode-jsonrpc`
- Et ~30 autres dépendances manquantes

**Solution:** Installer ou créer des stubs pour toutes ces dépendances

### 3. Pas de commande pour changer de provider après setup
**Problème:** Une fois configuré, impossible de changer de provider via CLI

**Solution:** Créer commande `/provider switch <provider-name>`

### 4. Tests incomplets
**Problème:** N'a pas testé avec vraie clé API

**Solution:** Tester la connexion complète avec Gemini 2.5 Flash

## 🔄 Fonctions désactivées et comment les réactiver

### Télémétrie (Analytics)
**Fichiers désactivés:**
- `src/services/analytics/` - Toutes les fonctions retournent `false` ou no-op
- `src/utils/telemetry/` - Collecte désactivée

**Comment réactiver:**
1. Ouvrir `src/services/analytics/index.ts`
2. Restaurer le code original des fonctions `logEvent()`, `logError()`, etc.
3. Vérifier que les tokens Datadog/BigQuery sont configurés

### Auto-updater npm
**Fichiers modifiés:**
- `src/utils/config.ts` - `isAutoUpdaterDisabled()` retourne toujours `true`

**Comment réactiver:**
```typescript
// Dans src/utils/config.ts
export function isAutoUpdaterDisabled(): boolean {
  return getInitialSettings().disableAutoUpdates ?? false // Au lieu de: return true
}
```

### OAuth Anthropic
**Fichiers modifiés:**
- `src/utils/auth.ts` - `isAnthropicAuthEnabled()` check le provider system
- `src/providers/bridge.ts` - Bypass OAuth si providers configurés

**Comment réactiver:**
```typescript
// Dans src/utils/auth.ts, ligne ~1234
export function isAnthropicAuthEnabled(): boolean {
  // Commenter cette ligne:
  // if (isMultiProviderEnabled()) return false
  
  return !process.env.ANTHROPIC_API_KEY && !isRunningOnHomespace()
}
```

### Background tasks désactivés
**Fichiers:** Plusieurs tools vérifient `DISABLE_BACKGROUND_TASKS`

**Comment réactiver:** Supprimer la variable d'environnement ou la setter à `false`

## 📋 Todos restants

1. **[IN PROGRESS] Fix Gemini model names**
   - ✅ Modèles mis à jour avec vrais noms
   - ⏳ Tester connexion avec clé free
   - ⏳ Changer modèle par défaut à `gemini-2.5-flash`

2. **[PENDING] Add provider switching**
   - Créer `/provider switch` command
   - Permettre changement de modèle en session
   - UI pour lister providers disponibles

3. **[PENDING] Test with real API key**
   - Tester Gemini 2.5 Flash
   - Vérifier streaming
   - Tester tool calling

4. **[PENDING] Fix build dependencies**
   - Installer/stub les 30+ packages manquants
   - Créer build script fonctionnel
   - Tester le binaire compilé

5. **[PENDING] Documentation**
   - Guide de réactivation des fonctions
   - Liste des providers supportés
   - Exemples d'utilisation

## 🏗️ Architecture actuelle

### Structure des providers
```
src/providers/
├── types.ts          # Interfaces et types
├── config.ts         # Gestion de providers.json
├── registry.ts       # Registry singleton
├── capabilities.ts   # Modèles disponibles
├── base.ts           # Provider de base
├── anthropic.ts      # Anthropic direct
├── openai.ts         # OpenAI direct
├── openrouter.ts     # OpenRouter
├── gemini.ts         # Google Gemini
├── ollama.ts         # Ollama local
├── adapter.ts        # Conversion messages
├── clientWrapper.ts  # Wrapper Anthropic SDK
└── bridge.ts         # Compat layer
```

### Points d'entrée
```
src/entrypoints/
├── cli.tsx          # Entry point principal ✅
├── init.ts          # Initialization
└── sdk/             # SDK types (stubs)
```

## 🔑 Clés API et Configuration

### Fichier de configuration
- **Location:** `~/.claude/providers.json`
- **Permissions:** 0600 (read/write owner only)
- **Format:**
```json
{
  "activeProvider": "gemini",
  "providers": {
    "gemini": {
      "enabled": true,
      "apiKey": "AIza...",
      "defaultModel": "gemini-2.5-flash",
      "baseUrl": "https://generativelanguage.googleapis.com/v1beta"
    }
  }
}
```

### Variables d'environnement supportées
- `ANTHROPIC_API_KEY` - Clé Anthropic directe
- `OPENAI_API_KEY` - Clé OpenAI
- `GEMINI_API_KEY` - Clé Gemini (Google AI)
- `OPENROUTER_API_KEY` - Clé OpenRouter
- `OLLAMA_HOST` - URL Ollama (default: http://localhost:11434)

## 🐛 Bugs connus

1. **Gemini free tier detection** - Pas de détection automatique du tier
2. **Build fails** - Trop de dépendances manquantes
3. **No provider switch command** - Doit éditer manuellement le JSON
4. **React compiler-runtime** - Patch node_modules écrasé par npm install

## 🚀 Prochaines étapes

1. Corriger le modèle par défaut Gemini → `gemini-2.5-flash`
2. Tester connexion Gemini avec clé free
3. Créer commande `/provider`
4. Implémenter détection du tier API
5. Ajouter validation de modèle avant connection test
6. Créer stubs pour build
