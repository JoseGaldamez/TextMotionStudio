export type Language = 'en' | 'es';

const en = {
    onboarding: {
        welcome: 'Welcome', tour: 'Tour', of: 'of', localSetup: 'Local AI setup', modelDownload: 'Model download', ready: 'Ready',
        headline: 'Create animated captions.', intro: 'Fast, private, and easy to use.', privacy: 'Your videos stay on your computer.',
        appLanguage: 'App language', getStarted: 'Get Started',
        tourItems: [
            {title: 'Import your video', description: 'Drag and drop your video and start creating captions in seconds.'},
            {title: 'Generate captions automatically', description: 'TextMotion Studio transcribes your video locally using AI.'},
            {title: 'Style and export', description: 'Choose a caption style, customize it and export your finished video.'},
        ],
        dropVideo: 'Drop a video here', sampleCaption: 'Great ideas deserve to be seen.', readyToExport: 'Ready to export',
        neverUploaded: 'Your video is never uploaded.', tourStep: 'Tour step', back: 'Back', continue: 'Continue', skipTour: 'Skip tour',
        setupTitle: 'Set up local transcription', setupDescription: 'TextMotion Studio uses a local AI model to generate captions. It only needs to be downloaded once.',
        benefits: ['Works offline after setup', 'Videos stay on your computer', 'No cloud processing required'],
        recommendedModel: 'Recommended model', downloadSize: 'Download size', downloadModel: 'Download Model', setupLater: 'Set up later',
        downloading: 'Downloading transcription model', settingUp: 'Setting up {model}, your local transcription model.', downloadProgress: 'Model download progress', keepOpen: 'Keep TextMotion Studio open while setup finishes.',
        readyTitle: "You're ready", readyDescription: 'TextMotion Studio is ready to generate captions locally.', firstProject: 'Create your first project', saveError: 'Could not save your setup. Please try again.',
    },
    sidebar: {navigation: 'Primary navigation', create: 'Create', styles: 'Styles', templates: 'Templates', export: 'Export', settings: 'Settings', processLocally: 'Process locally', privacy: 'Your videos stay on your computer.'},
    workflow: {label: 'Project workflow', load: 'Load your video', drop: 'Drag & drop a video file', replace: 'Click to replace video', browse: 'or click to browse', generate: 'Generate captions', captionLanguage: 'Caption language', englishAuto: 'English (Auto-detect)', spanish: 'Spanish', french: 'French', generating: 'Generating…', generated: 'Captions generated', generateButton: 'Generate Captions', style: 'Style your captions', export: 'Export', exportVideo: 'Export Video'},
    preview: {emptyTitle: 'Your video will appear here', emptyBody: 'Load a video to start creating animated captions.', pause: 'Pause video', play: 'Play video', position: 'Video position', toggleCaptions: 'Toggle captions', fullscreen: 'Enter fullscreen'},
    timeline: {label: 'Caption timeline', edit: 'Edit Captions', timeline: 'Timeline', search: 'Search captions', waveform: 'Show waveform', zoom: 'Timeline zoom', playhead: 'Video playhead', audioWaveform: 'Video audio waveform', analyzing: 'Analyzing video audio…', unavailable: 'The audio waveform is unavailable for this video.'},
    titlebar: {minimize: 'Minimize window', maximize: 'Maximize or restore window', close: 'Close window'},
    app: {loadError: 'Could not load your local settings. Please try again.', retry: 'Retry', loading: 'Loading TextMotion Studio…', workspace: 'Video caption workspace', resizePanels: 'Resize video and timeline panels', untitled: 'Untitled project', tagline: 'Better captions. Bigger stories.'},
    styles: [
        {name: 'Modern', description: 'Clean, readable, and stylish'},
        {name: 'Bold', description: 'High-impact words with weight'},
        {name: 'Karaoke', description: 'Word-by-word color emphasis'},
        {name: 'Minimal', description: 'Quiet type, maximum clarity'},
        {name: 'Pop', description: 'Playful scale and vivid color'},
    ],
} as const;

const es = {
    onboarding: {
        welcome: 'Bienvenido', tour: 'Recorrido', of: 'de', localSetup: 'Configuración de IA local', modelDownload: 'Descarga del modelo', ready: 'Listo',
        headline: 'Crea subtítulos animados.', intro: 'Rápido, privado y fácil de usar.', privacy: 'Tus videos permanecen en tu computadora.',
        appLanguage: 'Idioma de la aplicación', getStarted: 'Comenzar',
        tourItems: [
            {title: 'Importa tu video', description: 'Arrastra tu video y comienza a crear subtítulos en segundos.'},
            {title: 'Genera subtítulos automáticamente', description: 'TextMotion Studio transcribe tu video localmente con IA.'},
            {title: 'Personaliza y exporta', description: 'Elige un estilo de subtítulos, personalízalo y exporta tu video.'},
        ],
        dropVideo: 'Suelta un video aquí', sampleCaption: 'Las grandes ideas merecen ser vistas.', readyToExport: 'Listo para exportar',
        neverUploaded: 'Tu video nunca se sube a internet.', tourStep: 'Paso del recorrido', back: 'Atrás', continue: 'Continuar', skipTour: 'Omitir recorrido',
        setupTitle: 'Configura la transcripción local', setupDescription: 'TextMotion Studio usa un modelo de IA local para generar subtítulos. Solo necesitas descargarlo una vez.',
        benefits: ['Funciona sin conexión después de configurarlo', 'Los videos permanecen en tu computadora', 'No requiere procesamiento en la nube'],
        recommendedModel: 'Modelo recomendado', downloadSize: 'Tamaño de descarga', downloadModel: 'Descargar modelo', setupLater: 'Configurar más tarde',
        downloading: 'Descargando modelo de transcripción', settingUp: 'Configurando {model}, tu modelo de transcripción local.', downloadProgress: 'Progreso de descarga del modelo', keepOpen: 'Mantén TextMotion Studio abierto mientras termina la configuración.',
        readyTitle: 'Todo listo', readyDescription: 'TextMotion Studio está listo para generar subtítulos localmente.', firstProject: 'Crear mi primer proyecto', saveError: 'No se pudo guardar la configuración. Inténtalo de nuevo.',
    },
    sidebar: {navigation: 'Navegación principal', create: 'Crear', styles: 'Estilos', templates: 'Plantillas', export: 'Exportar', settings: 'Configuración', processLocally: 'Procesamiento local', privacy: 'Tus videos permanecen en tu computadora.'},
    workflow: {label: 'Flujo del proyecto', load: 'Carga tu video', drop: 'Arrastra un archivo de video', replace: 'Haz clic para reemplazarlo', browse: 'o haz clic para buscarlo', generate: 'Genera subtítulos', captionLanguage: 'Idioma de los subtítulos', englishAuto: 'Inglés (detección automática)', spanish: 'Español', french: 'Francés', generating: 'Generando…', generated: 'Subtítulos generados', generateButton: 'Generar subtítulos', style: 'Personaliza tus subtítulos', export: 'Exportar', exportVideo: 'Exportar video'},
    preview: {emptyTitle: 'Tu video aparecerá aquí', emptyBody: 'Carga un video para comenzar a crear subtítulos animados.', pause: 'Pausar video', play: 'Reproducir video', position: 'Posición del video', toggleCaptions: 'Mostrar u ocultar subtítulos', fullscreen: 'Pantalla completa'},
    timeline: {label: 'Línea de tiempo de subtítulos', edit: 'Editar subtítulos', timeline: 'Línea de tiempo', search: 'Buscar subtítulos', waveform: 'Mostrar onda de audio', zoom: 'Zoom de la línea de tiempo', playhead: 'Cabezal de reproducción', audioWaveform: 'Onda de audio del video', analyzing: 'Analizando el audio del video…', unavailable: 'La onda de audio no está disponible para este video.'},
    titlebar: {minimize: 'Minimizar ventana', maximize: 'Maximizar o restaurar ventana', close: 'Cerrar ventana'},
    app: {loadError: 'No se pudo cargar la configuración local. Inténtalo de nuevo.', retry: 'Reintentar', loading: 'Cargando TextMotion Studio…', workspace: 'Espacio de edición de subtítulos', resizePanels: 'Cambiar tamaño del video y la línea de tiempo', untitled: 'Proyecto sin título', tagline: 'Mejores subtítulos. Grandes historias.'},
    styles: [
        {name: 'Moderno', description: 'Claro, legible y elegante'},
        {name: 'Negrita', description: 'Palabras con más fuerza e impacto'},
        {name: 'Karaoke', description: 'Énfasis de color palabra por palabra'},
        {name: 'Minimalista', description: 'Tipografía discreta y máxima claridad'},
        {name: 'Pop', description: 'Escala divertida y colores vivos'},
    ],
};

export function getCopy(language: string | undefined) {
    return language === 'es' ? es : en;
}
