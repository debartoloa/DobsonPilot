/**
 * Dobson Pilot - Internationalization (i18n) & Automatic DOM Translator
 * Translates UI text nodes, placeholders, and titles across IT, EN, ES, FR, PT
 * in real time without modifying any JS business logic, event listeners, or DOM IDs.
 */

import { appState } from "../state.js";

/**
 * Comprehensive UI phrase dictionary mapping original Italian UI strings
 * (and bilingual labels) to English (en), Spanish (es), French (fr), and Portuguese (pt).
 */
const UI_PHRASES = {
  // Common Navigation & Actions
  "Indietro": { en: "Back", es: "Atrás", fr: "Retour", pt: "Voltar" },
  "Torna alla Home": { en: "Back to Home", es: "Volver al Inicio", fr: "Retour à l'accueil", pt: "Voltar ao Início" },
  "Accetta e Continua": { en: "Accept & Continue", es: "Aceptar y Continuar", fr: "Accepter et Continuer", pt: "Aceitar e Continuar" },
  "Annulla": { en: "Cancel", es: "Cancelar", fr: "Annuler", pt: "Cancelar" },
  "Conferma": { en: "Confirm", es: "Confirmar", fr: "Confirmer", pt: "Confirmar" },
  "Salva": { en: "Save", es: "Guardar", fr: "Enregistrer", pt: "Salvar" },
  "Modifica": { en: "Edit", es: "Editar", fr: "Modifier", pt: "Editar" },
  "Elimina": { en: "Delete", es: "Eliminar", fr: "Supprimer", pt: "Excluir" },
  "Chiudi": { en: "Close", es: "Cerrar", fr: "Fermer", pt: "Fechar" },
  "Tutte": { en: "All", es: "Todas", fr: "Toutes", pt: "Todas" },
  "Tutti": { en: "All", es: "Todos", fr: "Tous", pt: "Todos" },
  "✓ Solo Visibili": { en: "✓ Visible Only", es: "✓ Solo Visibles", fr: "✓ Visibles Uniquement", pt: "✓ Apenas Visíveis" },
  "Scegli ➔": { en: "Select ➔", es: "Elegir ➔", fr: "Choisir ➔", pt: "Escolher ➔" },
  "+ Aggiungi": { en: "+ Add", es: "+ Añadir", fr: "+ Ajouter", pt: "+ Adicionar" },
  "✓ Rimuovi": { en: "✓ Remove", es: "✓ Quitar", fr: "✓ Retirer", pt: "✓ Remover" },

  // Status Bar Tooltips
  "Fase 1: Bluetooth Connesso": { en: "Phase 1: Bluetooth Connected", es: "Fase 1: Bluetooth Conectado", fr: "Phase 1 : Bluetooth Connecté", pt: "Fase 1: Bluetooth Conectado" },
  "Fase 2: Ora/Data/Pos Sincronizzati": { en: "Phase 2: Time/Date/Loc Synced", es: "Fase 2: Hora/Fecha/Pos Sincronizados", fr: "Phase 2 : Heure/Date/Pos Synchronisés", pt: "Fase 2: Hora/Data/Pos Sincronizados" },
  "Fase 3: Allineamento Eseguito": { en: "Phase 3: Alignment Completed", es: "Fase 3: Alineación Completada", fr: "Phase 3 : Alignement Effectué", pt: "Fase 3: Alinhamento Concluído" },
  "Inseguimento siderale": { en: "Sidereal tracking", es: "Seguimiento sideral", fr: "Suivi sidéral", pt: "Rastreamento sideral" },
  "Stato / Connessione Bluetooth": { en: "Bluetooth Status / Connection", es: "Estado / Conexión Bluetooth", fr: "État / Connexion Bluetooth", pt: "Estado / Conexão Bluetooth" },
  "Impostazioni Bluetooth": { en: "Bluetooth Settings", es: "Ajustes Bluetooth", fr: "Paramètres Bluetooth", pt: "Configurações Bluetooth" },

  // Home & Menus
  "GoTo Menu": { en: "GoTo Menu", es: "Menú GoTo", fr: "Menu GoTo", pt: "Menu GoTo" },
  "Calib Menu": { en: "Calibration Menu", es: "Menú de Calibración", fr: "Menu Calibration", pt: "Menu de Calibração" },
  "Free Movement": { en: "Free Movement", es: "Movimiento Libre", fr: "Mouvement Libre", pt: "Movimento Livre" },
  "Config": { en: "Config", es: "Configuración", fr: "Configuration", pt: "Configuração" },
  "Telescope": { en: "Telescope", es: "Telescopio", fr: "Télescope", pt: "Telescópio" },
  "Calibrations": { en: "Calibrations", es: "Calibraciones", fr: "Calibrations", pt: "Calibrações" },
  "App Settings": { en: "App Settings", es: "Ajustes de la App", fr: "Paramètres de l'App", pt: "Configurações do App" },
  "Console Debug BLE": { en: "BLE Debug Console", es: "Consola Debug BLE", fr: "Console Debug BLE", pt: "Console Debug BLE" },
  "Calendar & Location": { en: "Calendar & Location", es: "Calendario y Ubicación", fr: "Calendrier et Position", pt: "Calendário e Localização" },
  "Other": { en: "Other Settings", es: "Otros Ajustes", fr: "Autres Paramètres", pt: "Outras Configurações" },
  "Show Settings": { en: "Show Settings", es: "Mostrar Ajustes", fr: "Afficher Paramètres", pt: "Mostrar Configurações" },

  // Bluetooth Setup
  "Bluetooth Setup": { en: "Bluetooth Setup", es: "Configuración Bluetooth", fr: "Configuration Bluetooth", pt: "Configuração Bluetooth" },
  "Stato Connessione:": { en: "Connection Status:", es: "Estado de Conexión:", fr: "État de Connexion :", pt: "Estado da Conexão:" },
  "Simulatore Mock Attivo": { en: "Mock Simulator Active", es: "Simulador Mock Activo", fr: "Simulateur Mock Actif", pt: "Simulador Mock Ativo" },
  "Connesso": { en: "Connected", es: "Conectado", fr: "Connecté", pt: "Conectado" },
  "Disconnesso": { en: "Disconnected", es: "Desconectado", fr: "Déconnecté", pt: "Desconectado" },
  "Nessun telescopio connesso. Avvia la scansione Web Bluetooth oppure attiva il simulatore Mock.": {
    en: "No telescope connected. Start Web Bluetooth scan or enable the Mock simulator.",
    es: "Ningún telescopio conectado. Inicia el escaneo Web Bluetooth o activa el simulador Mock.",
    fr: "Aucun télescope connecté. Lancez le scan Web Bluetooth ou activez le simulateur Mock.",
    pt: "Nenhum telescópio conectado. Inicie a busca Web Bluetooth ou ative o simulador Mock."
  },
  "Start Scan (Web Bluetooth)": { en: "Start Scan (Web Bluetooth)", es: "Iniciar Escaneo (Web Bluetooth)", fr: "Lancer Scan (Web Bluetooth)", pt: "Iniciar Busca (Web Bluetooth)" },
  "Scansione in corso...": { en: "Scanning...", es: "Escaneando...", fr: "Scan en cours...", pt: "Buscando..." },
  "Attiva Simulatore Mock (Test senza hardware)": {
    en: "Enable Mock Simulator (Test without hardware)",
    es: "Activar Simulador Mock (Prueba sin hardware)",
    fr: "Activer Simulateur Mock (Test sans matériel)",
    pt: "Ativar Simulador Mock (Teste sem hardware)"
  },
  "Disconnetti": { en: "Disconnect", es: "Desconectar", fr: "Déconnecter", pt: "Desconectar" },
  "Piattaforme Supportate": { en: "Supported Platforms", es: "Plataformas Soportadas", fr: "Plateformes Supportées", pt: "Plataformas Suportadas" },
  "Console & Diagnostica": { en: "Console & Diagnostics", es: "Consola y Diagnóstico", fr: "Console et Diagnostic", pt: "Console e Diagnóstico" },
  "Apri Console di Debug BLE & Log": {
    en: "Open BLE Debug Console & Logs",
    es: "Abrir Consola Debug BLE y Logs",
    fr: "Ouvrir Console Debug BLE et Journaux",
    pt: "Abrir Console Debug BLE e Logs"
  },

  // App Settings
  "🌐 Lingua / Language": { en: "🌐 Language", es: "🌐 Idioma / Language", fr: "🌐 Langue / Language", pt: "🌐 Idioma / Language" },
  "🔴 Night Mode (Visione Notturna)": {
    en: "🔴 Night Mode (Dark Red Vision)",
    es: "🔴 Modo Noche (Visión Nocturna Roja)",
    fr: "🔴 Mode Nuit (Vision Nocturne Rouge)",
    pt: "🔴 Modo Noturno (Visão Noturna Vermelha)"
  },
  "Applica un filtro rosso a contrasto preservando l'adattamento dell'occhio al buio.": {
    en: "Applies a high-contrast red filter preserving dark adaptation of the eye.",
    es: "Aplica un filtro rojo de alto contraste preservando la adaptación ocular a la oscuridad.",
    fr: "Applique un filtre rouge à haut contraste préservant l'adaptation de l'œil à l'obscurité.",
    pt: "Aplica um filtro vermelho de alto contraste preservando a adaptação ocular ao escuro."
  },
  "Come da specifica, non persiste alla chiusura dell'app.": {
    en: "By design, it does not persist when the app is closed.",
    es: "Por especificación, no persiste al cerrar la aplicación.",
    fr: "Par conception, ne persiste pas à la fermeture de l'application.",
    pt: "Por especificação, não persiste ao fechar o aplicativo."
  },
  "Attiva Night Mode": { en: "Enable Night Mode", es: "Activar Modo Noche", fr: "Activer Mode Nuit", pt: "Ativar Modo Noturno" },
  "Intensità:": { en: "Intensity:", es: "Intensidad:", fr: "Intensité :", pt: "Intensidade:" },
  "Livello 1 = Rosso Luminoso": { en: "Level 1 = Bright Red", es: "Nivel 1 = Rojo Brillante", fr: "Niveau 1 = Rouge Lumineux", pt: "Nível 1 = Vermelho Brilhante" },
  "1 (Luminoso)": { en: "1 (Bright)", es: "1 (Brillante)", fr: "1 (Lumineux)", pt: "1 (Brilhante)" },
  "5 (Attenuato)": { en: "5 (Dimmed)", es: "5 (Atenuado)", fr: "5 (Atténué)", pt: "5 (Atenuado)" },
  "🌌 Sfondo Stellato": { en: "🌌 Starry Background", es: "🌌 Fondo Estrellado", fr: "🌌 Fond Étoilé", pt: "🌌 Fundo Estrelado" },
  "Scegli tra i temi integrati o carica un'immagine astronomica personalizzata (max 5 MB).": {
    en: "Choose from built-in themes or upload a custom astronomical image (max 5 MB).",
    es: "Elige entre los temas integrados o sube una imagen astronómica personalizada (máx. 5 MB).",
    fr: "Choisissez parmi les thèmes intégrés ou chargez une image astronomique personnalisée (max 5 Mo).",
    pt: "Escolha entre os temas integrados ou carregue uma imagem astronômica personalizada (máx. 5 MB)."
  },
  "📷 Carica Immagine Propria (Max 5 MB)": {
    en: "📷 Upload Custom Image (Max 5 MB)",
    es: "📷 Subir Imagen Propia (Máx. 5 MB)",
    fr: "📷 Charger Image Personnalisée (Max 5 Mo)",
    pt: "📷 Carregar Imagem Própria (Máx. 5 MB)"
  },
  "⚙️ Preferenze Operative": {
    en: "⚙️ Operational Preferences",
    es: "⚙️ Preferencias Operativas",
    fr: "⚙️ Préférences Opérationnelles",
    pt: "⚙️ Preferências Operacionais"
  },
  "Riconnessione Automatica Bluetooth": {
    en: "Bluetooth Auto-Reconnect",
    es: "Reconexión Automática Bluetooth",
    fr: "Reconnexion Automatique Bluetooth",
    pt: "Reconexão Automática Bluetooth"
  },
  "Abilita Pulsante Stop GoTo": {
    en: "Enable Stop GoTo Button",
    es: "Habilitar Botón Stop GoTo",
    fr: "Activer le Bouton Stop GoTo",
    pt: "Habilitar Botão Stop GoTo"
  },
  "Estendi Rapporti Meccanici fino a 200": {
    en: "Extend Gear Ratios up to 200",
    es: "Extender Relaciones de Engranaje hasta 200",
    fr: "Étendre les Rapports de Réduction jusqu'à 200",
    pt: "Estender Relações de Engrenagem até 200"
  },

  // About Screen
  "Client open-source non ufficiale compatibile con CosmoPilot ESP32-S3 (ESP32-S3 con 2 motori NEMA17 e driver TMC2209), realizzato": {
    en: "Unofficial open-source client compatible with CosmoPilot ESP32-S3 (ESP32-S3 with 2x NEMA17 motors and TMC2209 drivers), created",
    es: "Cliente open-source no oficial compatible con CosmoPilot ESP32-S3 (ESP32-S3 con 2 motores NEMA17 y drivers TMC2209), desarrollado",
    fr: "Client open-source non officiel compatible avec CosmoPilot ESP32-S3 (ESP32-S3 avec 2 moteurs NEMA17 et drivers TMC2209), réalisé",
    pt: "Cliente open-source não oficial compatível com CosmoPilot ESP32-S3 (ESP32-S3 com 2 motores NEMA17 e drivers TMC2209), desenvolvido"
  },
  "esclusivamente a scopo di test e sperimentazione in ambito iOS": {
    en: "exclusively for testing and experimentation on iOS",
    es: "exclusivamente con fines de prueba y experimentación en iOS",
    fr: "exclusivement à des fins de test et d'expérimentation sous iOS",
    pt: "exclusivamente para fins de teste e experimentação no iOS"
  },
  "Per l'utilizzo ufficiale, il supporto completo e l'ecosistema originale si rimanda al sito e all'applicazione ufficiale": {
    en: "For official use, full support, and the original ecosystem, please refer to the official website and app",
    es: "Para el uso oficial, soporte completo y el ecosistema original, visite el sitio web y la aplicación oficial",
    fr: "Pour une utilisation officielle, un support complet et l'écosystème original, veuillez consulter le site et l'application officielle",
    pt: "Para uso oficial, suporte completo e o ecossistema original, consulte o site e o aplicativo oficial"
  },
  "🌐 Sito Ufficiale CosmoPilot (cosmo-pilot.com)": {
    en: "🌐 Official CosmoPilot Website (cosmo-pilot.com)",
    es: "🌐 Sitio Oficial CosmoPilot (cosmo-pilot.com)",
    fr: "🌐 Site Officiel CosmoPilot (cosmo-pilot.com)",
    pt: "🌐 Site Oficial CosmoPilot (cosmo-pilot.com)"
  },
  "Repository Firmware Open-Source (GitHub)": {
    en: "Open-Source Firmware Repository (GitHub)",
    es: "Repositorio de Firmware Open-Source (GitHub)",
    fr: "Dépôt du Firmware Open-Source (GitHub)",
    pt: "Repositório do Firmware Open-Source (GitHub)"
  },
  "Avvertenze di Sicurezza": {
    en: "Safety Warnings",
    es: "Advertencias de Seguridad",
    fr: "Avertissements de Sécurité",
    pt: "Avisos de Segurança"
  },

  // Joystick & Free Move
  " ⚠️ Telescopio non connesso. ": {
    en: " ⚠️ Telescope not connected. ",
    es: " ⚠️ Telescopio no conectado. ",
    fr: " ⚠️ Télescope non connecté. ",
    pt: " ⚠️ Telescópio não conectado. "
  },
  "⚠️ Telescopio non connesso.": {
    en: "⚠️ Telescope not connected.",
    es: "⚠️ Telescopio no conectado.",
    fr: "⚠️ Télescope non connecté.",
    pt: "⚠️ Telescópio não conectado."
  },
  "Attiva Mock": { en: "Enable Mock", es: "Activar Mock", fr: "Activer Mock", pt: "Ativar Mock" },
  "RA (Epoca):": { en: "RA (Epoch):", es: "AR (Época):", fr: "AD (Époque) :", pt: "AR (Época):" },
  "Velocità Motori:": { en: "Motor Speed:", es: "Velocidad Motores:", fr: "Vitesse Moteurs :", pt: "Velocidade dos Motores:" },
  "Inverti Su/Giù (ALT)": { en: "Invert Up/Down (ALT)", es: "Invertir Arriba/Abajo (ALT)", fr: "Inverser Haut/Bas (ALT)", pt: "Inverter Cima/Baixo (ALT)" },
  "Inverti Dx/Sx (AZ)": { en: "Invert Left/Right (AZ)", es: "Invertir Der/Izq (AZ)", fr: "Inverser Gauche/Droite (AZ)", pt: "Inverter Dir/Esq (AZ)" },
  "Avvia Inseguimento": { en: "Start Tracking", es: "Iniciar Seguimiento", fr: "Démarrer Suivi", pt: "Iniciar Rastreamento" },
  "Ferma Inseguimento": { en: "Stop Tracking", es: "Detener Seguimiento", fr: "Arrêter Suivi", pt: "Parar Rastreamento" },
  "🔒 Controlli Bloccati": { en: "🔒 Controls Locked", es: "🔒 Controles Bloqueados", fr: "🔒 Commandes Verrouillées", pt: "🔒 Controles Bloqueados" },
  "Levetta Fisica Attiva": { en: "Physical Joystick Active", es: "Joystick Físico Activo", fr: "Joystick Physique Actif", pt: "Joystick Físico Ativo" },
  "Muovi il telescopio tramite la levetta analogica montata sul tubo. Il pulsante fisico cicla le velocità preimpostate.": {
    en: "Move the telescope using the analog stick mounted on the tube. The physical button cycles preset speeds.",
    es: "Mueve el telescopio con la palanca analógica del tubo. El botón físico cambia las velocidades.",
    fr: "Déplacez le télescope avec le joystick analogique sur le tube. Le bouton physique change les vitesses.",
    pt: "Mova o telescópio usando a alavanca analógica no tubo. O botão físico alterna as velocidades."
  },
  "Movimento Manuale a Tubo Libero": {
    en: "Free-Tube Manual Movement",
    es: "Movimiento Manual de Tubo Libre",
    fr: "Mouvement Manuel à Tube Libre",
    pt: "Movimento Manual de Tubo Livre"
  },
  "Disattivando la coppia di tenuta dei motori NEMA17 puoi puntare il telescopio a mano liberamente.": {
    en: "By disabling the NEMA17 stepper holding torque, you can aim the telescope freely by hand.",
    es: "Al desactivar el par de retención de los motores NEMA17 puedes apuntar el telescopio a mano libremente.",
    fr: "En désactivant le couple de maintien des moteurs NEMA17, vous pouvez pointer le télescope librement à la main.",
    pt: "Ao desativar o torque de retenção dos motores NEMA17, você pode apontar o telescópio livremente à mão."
  },
  "Press to Disable (Rilascia Motori)": { en: "Press to Disable (Release Motors)", es: "Pulsa para Liberar Motores", fr: "Appuyer pour Libérer les Moteurs", pt: "Pressione para Liberar Motores" },
  "Press to Enable (Blocca Motori)": { en: "Press to Enable (Engage Motors)", es: "Pulsa para Bloquear Motores", fr: "Appuyer pour Verrouiller les Moteurs", pt: "Pressione para Travar Motores" },
  "MOTORI IN PRESA": { en: "MOTORS ENGAGED", es: "MOTORES BLOQUEADOS", fr: "MOTEURS ENGAGÉS", pt: "MOTORES TRAVADOS" },
  "MOTORI LIBERI (FOLLE)": { en: "MOTORS RELEASED (FREE)", es: "MOTORES LIBRES", fr: "MOTEURS LIBRES", pt: "MOTORES LIVRES" },
  "⚠️ Allineamento e Sicurezza": { en: "⚠️ Alignment & Safety", es: "⚠️ Alineación y Seguridad", fr: "⚠️ Alignement et Sécurité", pt: "⚠️ Alinhamento e Segurança" },

  // Calendar & Auto Sync
  "🕒 Orario UTC Corrente": { en: "🕒 Current UTC Time", es: "🕒 Hora UTC Actual", fr: "🕒 Heure UTC Actuelle", pt: "🕒 Horário UTC Atual" },
  "Sincronizzazione Automatica": { en: "Automatic Synchronization", es: "Sincronización Automática", fr: "Synchronisation Automatique", pt: "Sincronização Automática" },
  "Invia al telescopio Data (UTC), Ora (UTC) e Posizione GPS rilevate automaticamente dal telefono.": {
    en: "Sends Date (UTC), Time (UTC), and GPS Location automatically detected from your phone to the telescope.",
    es: "Envía al telescopio Fecha (UTC), Hora (UTC) y Ubicación GPS detectadas automáticamente por el teléfono.",
    fr: "Envoie au télescope la Date (UTC), l'Heure (UTC) et la Position GPS détectées automatiquement par le téléphone.",
    pt: "Envia ao telescópio Data (UTC), Hora (UTC) e Localização GPS detectadas automaticamente pelo telefone."
  },
  "🔄 Sincronizza Adesso": { en: "🔄 Sync Now", es: "🔄 Sincronizar Ahora", fr: "🔄 Synchroniser Maintenant", pt: "🔄 Sincronizar Agora" },
  "Sincronizzazione in corso...": { en: "Synchronizing...", es: "Sincronizando...", fr: "Synchronisation en cours...", pt: "Sincronizando..." },
  "ℹ️ Nota Firmware": { en: "ℹ️ Firmware Note", es: "ℹ️ Nota de Firmware", fr: "ℹ️ Note Firmware", pt: "ℹ️ Nota do Firmware" },
  "📅 Data & Ora (UTC)": { en: "📅 Date & Time (UTC)", es: "📅 Fecha y Hora (UTC)", fr: "📅 Date et Heure (UTC)", pt: "📅 Data e Hora (UTC)" },
  "Data UTC": { en: "UTC Date", es: "Fecha UTC", fr: "Date UTC", pt: "Data UTC" },
  "Ora UTC": { en: "UTC Time", es: "Hora UTC", fr: "Heure UTC", pt: "Hora UTC" },
  "Usa Ora e Data del Telefono (UTC)": { en: "Use Phone Date & Time (UTC)", es: "Usar Fecha y Hora del Teléfono (UTC)", fr: "Utiliser Date et Heure du Téléphone (UTC)", pt: "Usar Data e Hora do Telefone (UTC)" },
  "📍 Posizione Geografica": { en: "📍 Geographic Location", es: "📍 Ubicación Geográfica", fr: "📍 Position Géographique", pt: "📍 Localização Geográfica" },
  "Latitudine (° Nord +)": { en: "Latitude (° North +)", es: "Latitud (° Norte +)", fr: "Latitude (° Nord +)", pt: "Latitude (° Norte +)" },
  "Longitudine (° Est +)": { en: "Longitude (° East +)", es: "Longitud (° Este +)", fr: "Longitude (° Est +)", pt: "Longitude (° Leste +)" },
  "📡 Rileva GPS": { en: "📡 Get GPS", es: "📡 Detectar GPS", fr: "📡 Détecter GPS", pt: "📡 Obter GPS" },
  "⭐ Salva Luogo": { en: "⭐ Save Place", es: "⭐ Guardar Lugar", fr: "⭐ Enregistrer Lieu", pt: "⭐ Salvar Local" },
  "Luoghi Preferiti (fino a 5)": { en: "Saved Locations (up to 5)", es: "Lugares Favoritos (hasta 5)", fr: "Lieux Favoris (jusqu'à 5)", pt: "Locais Favoritos (até 5)" },
  "📤 Invia Tutti al Telescopio": { en: "📤 Send All to Telescope", es: "📤 Enviar Todo al Telescopio", fr: "📤 Tout Envoyer au Télescope", pt: "📤 Enviar Tudo ao Telescópio" },

  // Show Settings & Other Settings
  "Tocca il pulsante per interrogare l'ESP32 e leggere i parametri attuali.": {
    en: "Tap the button to query the ESP32 and read current parameters.",
    es: "Toca el botón para consultar el ESP32 y leer los parámetros actuales.",
    fr: "Appuyez sur le bouton pour interroger l'ESP32 et lire les paramètres actuels.",
    pt: "Toque no botão para consultar o ESP32 e ler os parâmetros atuais."
  },
  "⚙️ Sistema & Riduzioni Meccaniche": { en: "⚙️ System & Gear Reductions", es: "⚙️ Sistema y Reducciones Mecánicas", fr: "⚙️ Système et Réductions Mécaniques", pt: "⚙️ Sistema e Reduções Mecânicas" },
  "Inversione Assi": { en: "Axis Inversion", es: "Inversión de Ejes", fr: "Inversion des Axes", pt: "Inversão de Eixos" },
  "📅 Data, Ora & Coordinate Telescopio": { en: "📅 Telescope Date, Time & Coordinates", es: "📅 Fecha, Hora y Coordenadas", fr: "📅 Date, Heure et Coordonnées", pt: "📅 Data, Hora e Coordenadas" },
  "Data Ricevuta": { en: "Received Date", es: "Fecha Recibida", fr: "Date Reçue", pt: "Data Recebida" },
  "Ora UTC Ricevuta": { en: "Received UTC Time", es: "Hora UTC Recibida", fr: "Heure UTC Reçue", pt: "Hora UTC Recebida" },
  "Posizione Geografica": { en: "Geographic Location", es: "Ubicación Geográfica", fr: "Position Géographique", pt: "Localização Geográfica" },
  "🎯 Movimento & Calibrazioni": { en: "🎯 Motion & Calibrations", es: "🎯 Movimiento y Calibraciones", fr: "🎯 Mouvement et Calibrations", pt: "🎯 Movimento e Calibrações" },
  "Velocità Massima": { en: "Max Speed", es: "Velocidad Máxima", fr: "Vitesse Maximale", pt: "Velocidade Máxima" },
  "Intervallo Tracking": { en: "Tracking Interval", es: "Intervalo de Seguimiento", fr: "Intervalle de Suivi", pt: "Intervalo de Rastreamento" },
  "📤 Invia Modifiche al Telescopio": { en: "📤 Send Changes to Telescope", es: "📤 Enviar Cambios al Telescopio", fr: "📤 Envoyer Modifications au Télescope", pt: "📤 Enviar Alterações ao Telescópio" },

  // Manual GoTo, Solar System, Catalog, Random, Tours & Game
  "Coordinate Celesti (RA / Dec)": { en: "Celestial Coordinates (RA / Dec)", es: "Coordenadas Celestes (AR / Dec)", fr: "Coordonnées Célestes (AD / Déc)", pt: "Coordenadas Celestes (AR / Dec)" },
  "Coordinate Orizzontali (Alt / Az)": { en: "Horizontal Coordinates (Alt / Az)", es: "Coordenadas Horizontales (Alt / Az)", fr: "Coordonnées Horizontales (Alt / Az)", pt: "Coordenadas Horizontais (Alt / Az)" },
  "Ascensione Retta (RA - J2000 o Data)": { en: "Right Ascension (RA - J2000 or Date)", es: "Ascensión Recta (AR - J2000 o Fecha)", fr: "Ascension Droite (AD - J2000 ou Date)", pt: "Ascensão Reta (AR - J2000 ou Data)" },
  "Declinazione (DEC)": { en: "Declination (DEC)", es: "Declinación (DEC)", fr: "Déclinaison (DÉC)", pt: "Declinação (DEC)" },
  "Ore (0-23)": { en: "Hours (0-23)", es: "Horas (0-23)", fr: "Heures (0-23)", pt: "Horas (0-23)" },
  "Minuti (0-59)": { en: "Minutes (0-59)", es: "Minutos (0-59)", fr: "Minutes (0-59)", pt: "Minutos (0-59)" },
  "Secondi (0-59)": { en: "Seconds (0-59)", es: "Segundos (0-59)", fr: "Secondes (0-59)", pt: "Segundos (0-59)" },
  "Gradi (-90..+90)": { en: "Degrees (-90..+90)", es: "Grados (-90..+90)", fr: "Degrés (-90..+90)", pt: "Graus (-90..+90)" },
  "Primi (0-59)": { en: "Arcmin (0-59)", es: "Minutos (0-59)", fr: "Minutes d'arc (0-59)", pt: "Minutos (0-59)" },
  "Altezza (Altitudine) & Azimuth": { en: "Altitude & Azimuth", es: "Altitud y Acimut", fr: "Hauteur (Altitude) et Azimut", pt: "Altitude e Azimute" },
  "Altezza (0°..90°)": { en: "Altitude (0°..90°)", es: "Altitud (0°..90°)", fr: "Altitude (0°..90°)", pt: "Altitude (0°..90°)" },
  "Centratura Fine Manuale": { en: "Manual Fine Centering", es: "Centrado Fino Manual", fr: "Centrage Fin Manuel", pt: "Centralização Fina Manual" },
  "Verifica Visibilità FW": { en: "Check FW Visibility", es: "Verificar Visibilidad FW", fr: "Vérifier Visibilité FW", pt: "Verificar Visibilidade FW" },
  "Interroga l'ESP32 sullo stato dei pianeti": { en: "Query ESP32 on planet visibility", es: "Consultar al ESP32 sobre los planetas", fr: "Interroger l'ESP32 sur l'état des planètes", pt: "Consultar o ESP32 sobre os planetas" },
  "🎲 Next Object (Prossimo Bersaglio)": { en: "🎲 Next Object", es: "🎲 Siguiente Objeto", fr: "🎲 Objet Suivant", pt: "🎲 Próximo Objeto" },
  "Ascensione Retta": { en: "Right Ascension", es: "Ascensión Recta", fr: "Ascension Droite", pt: "Ascensão Reta" },
  "Declinazione": { en: "Declination", es: "Declinación", fr: "Déclinaison", pt: "Declinação" },
  "Riconosci il Cielo": { en: "Recognize the Sky", es: "Reconoce el Cielo", fr: "Reconnaître le Ciel", pt: "Reconheça o Céu" },
  "Indovina l'oggetto inquadrato dal telescopio!": { en: "Guess the object framed by the telescope!", es: "¡Adivina el objeto enfocado por el telescopio!", fr: "Devinez l'objet cadré par le télescope !", pt: "Adivinhe o objeto enquadrado pelo telescópio!" },
  "Miglior Punteggio di Sempre:": { en: "All-Time High Score:", es: "Mejor Puntuación:", fr: "Meilleur Score :", pt: "Melhor Pontuação:" },
  "Magnitudine Massima Bersagli:": { en: "Max Target Magnitude:", es: "Magnitud Máxima de Objetivos:", fr: "Magnitude Maximale des Cibles :", pt: "Magnitude Máxima dos Alvos:" },
  "5.0 (Min / Molto luminosi)": { en: "5.0 (Min / Very bright)", es: "5.0 (Mín / Muy brillantes)", fr: "5.0 (Min / Très brillants)", pt: "5.0 (Mín / Muito brilhantes)" },
  "11.0 (Profondo cielo)": { en: "11.0 (Deep sky)", es: "11.0 (Cielo profundo)", fr: "11.0 (Ciel profond)", pt: "11.0 (Céu profundo)" },
  "Inizia Partita 🚀": { en: "Start Game 🚀", es: "Iniciar Partida 🚀", fr: "Commencer Partie 🚀", pt: "Iniciar Jogo 🚀" },

  // Hardware Calibrations & Alignment
  "1. Calibrazione Posizione Neutra (Idle)": { en: "1. Idle / Neutral Position Calibration", es: "1. Calibración Posición Neutra (Idle)", fr: "1. Calibration Position Neutre (Idle)", pt: "1. Calibração Posição Neutra (Idle)" },
  "Lascia la levetta analogica del telescopio completamente ferma al centro per calibrare la zona morta (deadband).": {
    en: "Leave the telescope's analog joystick completely still at the center to calibrate the deadband.",
    es: "Deja la palanca analógica del telescopio completamente quieta en el centro para calibrar la zona muerta.",
    fr: "Laissez le joystick analogique du télescope complètement immobile au centre pour calibrer la zone morte.",
    pt: "Deixe a alavanca analógica do telescópio completamente parada no centro para calibrar a zona morta."
  },
  "2. Calibrazione Escursione Massima": { en: "2. Maximum Range Calibration", es: "2. Calibración de Recorrido Máximo", fr: "2. Calibration Amplitude Maximale", pt: "2. Calibração de Curso Máximo" },
  "Muovi la levetta in tutte le direzioni!": { en: "Move the stick in all directions!", es: "¡Mueve la palanca en todas direcciones!", fr: "Bougez le stick dans toutes les directions !", pt: "Mova a alavanca em todas as direções!" },
  "🧭 Configurazione Direzioni Motori": { en: "🧭 Motor Direction Setup", es: "🧭 Configuración de Direcciones de Motores", fr: "🧭 Configuration Directions Moteurs", pt: "🧭 Configuração de Direções dos Motores" },
  "Verifica Altezza (ALT)": { en: "Verify Altitude (ALT)", es: "Verificar Altitud (ALT)", fr: "Vérifier Hauteur (ALT)", pt: "Verificar Altitude (ALT)" },
  "Il tubo si è inclinato verso l'alto (verso lo zenit)?": { en: "Did the tube tilt upwards (toward the zenith)?", es: "¿El tubo se inclinó hacia arriba (hacia el cenit)?", fr: "Le tube s'est-il incliné vers le haut (vers le zénith) ?", pt: "O tubo inclinou para cima (em direção ao zênite)?" },
  "Verifica Azimuth (AZ)": { en: "Verify Azimuth (AZ)", es: "Verificar Acimut (AZ)", fr: "Vérifier Azimut (AZ)", pt: "Verificar Azimute (AZ)" },
  "La base ha ruotato in senso orario (verso destra)?": { en: "Did the base rotate clockwise (to the right)?", es: "¿La base giró en sentido horario (hacia la derecha)?", fr: "La base a-t-elle tourné dans le sens horaire (vers la droite) ?", pt: "A base girou no sentido horário (para a direita)?" },
  "No (Inverti)": { en: "No (Invert)", es: "No (Invertir)", fr: "Non (Inverser)", pt: "Não (Inverter)" },
  "Yes (Corretto)": { en: "Yes (Correct)", es: "Sí (Correcto)", fr: "Oui (Correct)", pt: "Sim (Correto)" },
  "Calibrazione Direzioni Completata!": { en: "Direction Calibration Completed!", es: "¡Calibración de Direcciones Completada!", fr: "Calibration des Directions Terminée !", pt: "Calibração de Direções Concluída!" },
  "Torna alle Calibrazioni ✓": { en: "Back to Calibrations ✓", es: "Volver a Calibraciones ✓", fr: "Retour aux Calibrations ✓", pt: "Voltar às Calibrações ✓" },
  "⚙️ Rapporti di Riduzione (Gear Ratio)": { en: "⚙️ Motor Gear Reduction Ratios", es: "⚙️ Relaciones de Reducción (Gear Ratio)", fr: "⚙️ Rapports de Réduction (Gear Ratio)", pt: "⚙️ Relações de Redução (Gear Ratio)" },
  "Salva Gear Ratio nel Telescopio 💾": { en: "Save Gear Ratio to Telescope 💾", es: "Guardar Gear Ratio en el Telescopio 💾", fr: "Enregistrer Gear Ratio dans le Télescope 💾", pt: "Salvar Gear Ratio no Telescópio 💾" },
  "🔄 Compensazione Gioco (Backlash)": { en: "🔄 Backlash Compensation", es: "🔄 Compensación de Holgura (Backlash)", fr: "🔄 Compensation du Jeu (Backlash)", pt: "🔄 Compensação de Folga (Backlash)" },
  "Salva Backlash nel Telescopio 💾": { en: "Save Backlash to Telescope 💾", es: "Guardar Backlash en el Telescopio 💾", fr: "Enregistrer Backlash dans le Télescope 💾", pt: "Salvar Backlash no Telescópio 💾" },
  "🎮 Verifica Gioco con i Joystick:": { en: "🎮 Check Backlash with Joysticks:", es: "🎮 Verificar Holgura con Joysticks:", fr: "🎮 Vérifier le Jeu avec les Joysticks :", pt: "🎮 Verificar Folga com Joysticks:" },
  "1. Preparazione Test": { en: "1. Test Preparation", es: "1. Preparación de Prueba", fr: "1. Préparation du Test", pt: "1. Preparação do Teste" },
  "2. Check ALT (90° da Orizzontale a Verticale)": { en: "2. Check ALT (90° Horizontal to Vertical)", es: "2. Check ALT (90° de Horizontal a Vertical)", fr: "2. Check ALT (90° d'Horizontal à Vertical)", pt: "2. Check ALT (90° de Horizontal a Vertical)" },
  "3. Check AZ (Rotazione Completa 360°)": { en: "3. Check AZ (Full 360° Rotation)", es: "3. Check AZ (Rotación Completa 360°)", fr: "3. Check AZ (Rotation Complète 360°)", pt: "3. Check AZ (Rotação Completa 360°)" },
  "⚠️ Ripristino Dati di Fabbrica": { en: "⚠️ Factory Reset", es: "⚠️ Restablecimiento de Fábrica", fr: "⚠️ Réinitialisation d'Usine", pt: "⚠️ Restauração de Fábrica" },
  "Tieni Premuto per 3 Secondi (Reset)": { en: "Hold for 3 Seconds (Reset)", es: "Mantén Pulsado 3 Segundos (Reset)", fr: "Maintenir 3 Secondes (Reset)", pt: "Segure por 3 Segundos (Reset)" },

  // Alignment & Tours
  "🎯 Centratura manuale": { en: "🎯 Manual Centering", es: "🎯 Centrado Manual", fr: "🎯 Centrage Manuel", pt: "🎯 Centralização Manual" },
  "🎯 Centratura fine": { en: "🎯 Fine Centering", es: "🎯 Centrado Fino", fr: "🎯 Centrage Fin", pt: "🎯 Centralização Fina" },
  "Controllo Rapido Motori": { en: "Quick Motor Control", es: "Control Rápido de Motores", fr: "Contrôle Rapide Moteurs", pt: "Controle Rápido dos Motores" },
  "Prima stella selezionata:": { en: "First star selected:", es: "Primera estrella seleccionada:", fr: "Première étoile sélectionnée :", pt: "Primeira estrela selecionada:" },
  "(Scegli una stella con separazione ≥ 30°)": { en: "(Choose a star with separation ≥ 30°)", es: "(Elige una estrella con separación ≥ 30°)", fr: "(Choisissez une étoile avec séparation ≥ 30°)", pt: "(Escolha uma estrela com separação ≥ 30°)" },
  "1. Dettagli Sessione Osservativa": { en: "1. Observing Session Details", es: "1. Detalles de la Sesión", fr: "1. Détails de la Session", pt: "1. Detalhes da Sessão" },
  "Data Osservazione": { en: "Observation Date", es: "Fecha de Observación", fr: "Date d'Observation", pt: "Data de Observação" },
  "Ora Inizio": { en: "Start Time", es: "Hora de Inicio", fr: "Heure de Début", pt: "Hora de Início" },
  "Durata Sessione": { en: "Session Duration", es: "Duración de la Sesión", fr: "Durée de la Session", pt: "Duração da Sessão" },
  "Luogo di Osservazione": { en: "Observation Location", es: "Lugar de Observación", fr: "Lieu d'Observation", pt: "Local de Observação" },
  "Avanti: Scegli Oggetti ➔": { en: "Next: Choose Objects ➔", es: "Siguiente: Elegir Objetos ➔", fr: "Suivant : Choisir Objets ➔", pt: "Avançar: Escolher Objetos ➔" },
  "+ Nuovo": { en: "+ New", es: "+ Nuevo", fr: "+ Nouveau", pt: "+ Novo" },
  "Filtri avanzati": { en: "Advanced filters", es: "Filtros avanzados", fr: "Filtres avancés", pt: "Filtros avançados" }
};

/**
 * Pattern rules for dynamic strings (e.g. "Livello 3", "Versione 1.0.0 (Licenza MIT)", etc.)
 */
const DYNAMIC_PATTERNS = [
  {
    regex: /^Versione\s+([\d.]+)\s+\(Licenza MIT\)$/,
    en: "Version $1 (MIT License)",
    es: "Versión $1 (Licencia MIT)",
    fr: "Version $1 (Licence MIT)",
    pt: "Versão $1 (Licença MIT)"
  },
  {
    regex: /^Livello\s+(\d+)$/,
    en: "Level $1",
    es: "Nivel $1",
    fr: "Niveau $1",
    pt: "Nível $1"
  },
  {
    regex: /^Velocità:\s*(\d+)$/,
    en: "Speed: $1",
    es: "Velocidad: $1",
    fr: "Vitesse : $1",
    pt: "Velocidade: $1"
  },
  {
    regex: /^(\d+)\s+Oggetti$/,
    en: "$1 Objects",
    es: "$1 Objetos",
    fr: "$1 Objets",
    pt: "$1 Objetos"
  },
  {
    regex: /^✓ Visibile:\s*Alt\s*([^\s|]+)\s*\|\s*Az\s*(.+)$/,
    en: "✓ Visible: Alt $1 | Az $2",
    es: "✓ Visible: Alt $1 | Az $2",
    fr: "✓ Visible : Alt $1 | Az $2",
    pt: "✓ Visível: Alt $1 | Az $2"
  }
];

class I18nManager {
  constructor() {
    this.currentLocale = "it";
    this.translations = {};
    this.observer = null;
    this.isUpdating = false;
  }

  async init() {
    this.currentLocale = appState.settings.language || "it";
    await this.loadLocale(this.currentLocale);
    this.setupObserver();
    this.updateDom();
  }

  async loadLocale(locale) {
    try {
      const resp = await fetch(`./js/i18n/${locale}.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this.translations[locale] = await resp.json();
      this.currentLocale = locale;
    } catch (err) {
      console.warn(`Could not load locale ${locale}, fallback to en:`, err);
      this.currentLocale = locale;
      if (locale !== "en") {
        try {
          const r2 = await fetch(`./js/i18n/en.json`);
          if (r2.ok) this.translations["en"] = await r2.json();
        } catch (e2) {
          console.warn("Could not load fallback locale en:", e2);
        }
      }
    }
  }

  t(key, fallback = "") {
    const dict = this.translations[this.currentLocale] || this.translations["it"] || {};
    return dict[key] || fallback || key;
  }

  translatePhrase(rawText, locale) {
    if (!rawText || typeof rawText !== "string") return rawText;
    const trimmed = rawText.trim();
    if (!trimmed) return rawText;

    if (locale === "it") {
      return rawText;
    }

    // 1. Exact phrase match
    const entry = UI_PHRASES[trimmed];
    if (entry && entry[locale]) {
      const leading = rawText.match(/^\s*/)?.[0] || "";
      const trailing = rawText.match(/\s*$/)?.[0] || "";
      return `${leading}${entry[locale]}${trailing}`;
    }

    // 2. Dynamic regex pattern match
    for (const pat of DYNAMIC_PATTERNS) {
      if (pat.regex.test(trimmed) && pat[locale]) {
        const leading = rawText.match(/^\s*/)?.[0] || "";
        const trailing = rawText.match(/\s*$/)?.[0] || "";
        const replaced = trimmed.replace(pat.regex, pat[locale]);
        return `${leading}${replaced}${trailing}`;
      }
    }

    return rawText;
  }

  async setLocale(locale) {
    await this.loadLocale(locale);
    appState.saveSettings({ language: locale });
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale;
    }
    // Sync language selectors if present
    if (typeof document !== "undefined" && document.querySelector) {
      const topSel = document.querySelector("#top-lang-select");
      if (topSel && topSel.value !== locale) topSel.value = locale;
      const appSel = document.querySelector("#select-app-language");
      if (appSel && appSel.value !== locale) appSel.value = locale;
    }
    this.updateDom();
  }

  setupObserver() {
    if (typeof MutationObserver === "undefined" || typeof document === "undefined" || !document.body) {
      return;
    }
    if (this.observer) return;

    let scheduled = false;
    this.observer = new MutationObserver(() => {
      if (this.isUpdating || scheduled) return;
      scheduled = true;
      Promise.resolve().then(() => {
        scheduled = false;
        this.updateDom();
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  updateDom() {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    this.isUpdating = true;

    try {
      const locale = this.currentLocale || "it";

      // 1. Update explicit [data-i18n] elements
      document.querySelectorAll("[data-i18n]").forEach(elem => {
        const key = elem.getAttribute("data-i18n");
        const text = this.t(key);
        if (text) {
          elem.textContent = text;
        }
      });

      // 2. Translate title and placeholder attributes
      document.querySelectorAll("[title], [placeholder]").forEach(el => {
        if (el.hasAttribute("title")) {
          const curTitle = el.getAttribute("title");
          if (el.__origTitle === undefined || (curTitle !== el.__lastTitle && curTitle !== el.__origTitle)) {
            el.__origTitle = curTitle;
          }
          const nextTitle = this.translatePhrase(el.__origTitle, locale);
          el.__lastTitle = nextTitle;
          if (curTitle !== nextTitle) {
            el.setAttribute("title", nextTitle);
          }
        }
        if (el.hasAttribute("placeholder")) {
          const curPh = el.getAttribute("placeholder");
          if (el.__origPh === undefined || (curPh !== el.__lastPh && curPh !== el.__origPh)) {
            el.__origPh = curPh;
          }
          const nextPh = this.translatePhrase(el.__origPh, locale);
          el.__lastPh = nextPh;
          if (curPh !== nextPh) {
            el.setAttribute("placeholder", nextPh);
          }
        }
      });

      // 3. Walk text nodes in #app-container and #onboarding-modal
      if (typeof document.createTreeWalker === "function") {
        const roots = [
          document.getElementById?.("app-container"),
          document.getElementById?.("onboarding-modal")
        ].filter(Boolean);

        for (const root of roots) {
          const walker = document.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
          let node;
          while ((node = walker.nextNode())) {
            const parentTag = node.parentElement?.tagName;
            if (parentTag === "SCRIPT" || parentTag === "STYLE") continue;
            if (node.parentElement?.closest?.("#debug-log-list, .coord-box")) continue;

            const currentVal = node.nodeValue;
            if (!currentVal || !currentVal.trim()) continue;

            // Capture original Italian string or detect dynamic JS update
            if (
              node.__origText === undefined ||
              (currentVal !== node.__lastTranslated && currentVal !== node.__origText)
            ) {
              node.__origText = currentVal;
            }

            const translated = this.translatePhrase(node.__origText, locale);
            node.__lastTranslated = translated;
            if (node.nodeValue !== translated) {
              node.nodeValue = translated;
            }
          }
        }
      }
    } finally {
      this.isUpdating = false;
    }
  }
}

export const i18n = new I18nManager();
