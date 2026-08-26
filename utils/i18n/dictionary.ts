export const LOCALE_COOKIE = "opendaycare-locale";
export const DEFAULT_LOCALE = "es" as const;
export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type Dictionary = {
  locale: Locale;
  metadata: { description: string };
  language: {
    label: string;
    switchToSpanish: string;
    switchToEnglish: string;
  };
  common: Record<string, string>;
  auth: Record<string, string>;
  navigation: Record<string, string>;
  feed: Record<string, string>;
  posts: Record<string, string>;
  kids: {
    management: string;
    title: string;
    addChild: string;
    activeChildren: string;
    archivedChildren: string;
    searchChild: string;
    searchPlaceholder: string;
    room: string;
    child: string;
    children: string;
    noSearchResults: string;
    noArchivedChildren: string;
    noChildren: string;
    fullName: string;
    fullNamePlaceholder: string;
    birthDate: string;
    enrollmentDate: string;
    allergies: string;
    allergiesPlaceholder: string;
    medicalNotes: string;
    medicalNotesPlaceholder: string;
    photoConsent: string;
    editChild: string;
    editDescription: string;
    saveChanges: string;
    childManagement: string;
    restoreChild: string;
    archiveChild: string;
    permanentlyDelete: string;
    deleteConfirmationLabel: string;
    deleteConfirmationHint: string;
    archiveConfirmation: string;
    allergiesAndNotes: string;
    allergiesSummary: string;
    noAllergies: string;
    noMedicalNotes: string;
    childDetailsBirthDate: string;
    childDetailsRoom: string;
    childDetailsEnrollment: string;
    childDetailsPhotoConsent: string;
    childDetailsStatus: string;
    linkParents: string;
    linkParent: string;
    linkAnotherParent: string;
    invitationEditLabel: string;
    deliveryError: string;
    expires: string;
    emailSent: string;
    noLinkedParents: string;
    noChildrenLoadedLabel: string;
    noChildrenLoadedTitle: string;
    noChildrenLoadedDescription: string;
    noRoomAssigned: string;
    noRoomAssignedDescription: string;
    validation: {
      fullName: string;
      birthDate: string;
      enrollmentDate: string;
      enrollmentAfterToday: string;
      room: string;
      birthBeforeEnrollment: string;
    };
  };
  invitations: {
    mother: string;
    father: string;
    guardian: string;
    [key: string]: string;
  };
  pending: {
    [key: string]: string;
  };
  actions: {
    children: Record<string, string>;
    invitations: Record<string, string>;
    posts: Record<string, string>;
    authorizationError: string;
    activationError: string;
  };
  email: {
    [key: string]: string;
  };
  postTypes: {
    [key: string]: string;
  };
};

const spanish: Dictionary = {
  locale: "es",
  metadata: { description: "La comunidad de tu guardería" },
  language: {
    label: "Idioma",
    switchToSpanish: "Cambiar a español",
    switchToEnglish: "Cambiar a inglés",
  },
  common: {
    cancel: "Cancelar",
    close: "Cerrar",
    save: "Guardar",
    saving: "Guardando…",
    deleting: "Eliminando…",
    retry: "Reintentar",
    backToFeed: "Volver al feed",
    backToChildren: "Volver a Niños",
    loading: "Cargando…",
    yes: "Sí",
    no: "No",
    active: "Activa",
    pending: "Pendiente",
    archived: "Archivado",
    year: "año",
    years: "años",
  },
  auth: {
    heroTitle: "El día de cada niño, compartido con su familia.",
    heroDescription: "Publicá momentos, gestioná las salas y mantené a las familias cerca, desde un solo lugar.",
    heroFooter: "Guardería Sala Soles",
    loginTitle: "Iniciar sesión",
    loginSubtitle: "Ingresá para ver el día de hoy.",
    email: "EMAIL",
    password: "CONTRASEÑA",
    passwordPlaceholder: "••••••••",
    forgotPassword: "¿Olvidaste tu contraseña?",
    login: "Iniciar sesión",
    loggingIn: "Iniciando sesión…",
    loginError: "El email o la contraseña no son correctos.",
    activationSuccess: "Tu cuenta fue activada y el vínculo con el niño quedó confirmado.",
    activationError: "No se pudo completar la activación. Revisa el enlace e inténtalo nuevamente.",
    activationPending: "Revisa tu correo para confirmar la cuenta y completar la activación.",
    invitedPrompt: "¿Te invitó la guardería?",
    activateAccount: "Activá tu cuenta",
    activationTitle: "Bienvenida a OpenDayCare",
    activationDescription: "Te invitaron a seguir el día de tu hijo. Completa tus datos para activar la cuenta.",
    blockedSession: "Cierra la sesión actual y vuelve a abrir este enlace con la cuenta del padre invitado.",
    invitationCode: "CÓDIGO DE INVITACIÓN",
    invitedEmail: "EMAIL AL QUE RECIBISTE LA INVITACIÓN",
    accountName: "NOMBRE PARA TU CUENTA",
    createPassword: "CREAR CONTRASEÑA",
    photoConsent: "Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app.",
    activationValidation: "Ingresa el código, email, nombre y contraseña (mínimo 8 caracteres).",
    activationExistingValidation: "Ingresa el código de invitación y tu nombre.",
    processing: "Procesando…",
    acceptInvitation: "Aceptar invitación",
    activateMyAccount: "Activar mi cuenta",
    alreadyHaveAccount: "¿Ya tenés cuenta?",
    recoverySuccess: "Tu contraseña fue actualizada. Ya puedes iniciar sesión.",
    recoveryInvalidLink: "El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.",
    recoveryTitle: "Recuperar contraseña",
    recoveryDescription: "Ingresa tu email y te enviaremos instrucciones para crear una nueva contraseña.",
    recoveryEmailInvalid: "Ingresa un email válido.",
    recoveryRequestError: "No se pudo procesar la solicitud. Intenta nuevamente.",
    recoveryRequestSuccess: "Si existe una cuenta asociada a ese email, recibirás un enlace para recuperar tu contraseña. Revisa también tu carpeta de spam.",
    recoverySending: "Enviando…",
    recoverySubmit: "Enviar instrucciones",
    recoveryBackToLogin: "Volver a iniciar sesión",
    recoveryResetTitle: "Crear nueva contraseña",
    recoveryResetDescription: "Elige una contraseña nueva para volver a entrar a tu cuenta.",
    recoveryNewPassword: "NUEVA CONTRASEÑA",
    recoveryConfirmPassword: "CONFIRMAR CONTRASEÑA",
    recoveryVerifying: "Verificando el enlace de recuperación…",
    recoveryPasswordTooShort: "La contraseña debe tener al menos 8 caracteres.",
    recoveryPasswordMismatch: "Las contraseñas no coinciden.",
    recoveryUpdateError: "No se pudo actualizar la contraseña. Solicita un enlace nuevo e inténtalo nuevamente.",
    recoveryCleanupError: "La contraseña fue actualizada, pero no pudimos cerrar este enlace de recuperación. Cierra esta pestaña e inicia sesión nuevamente.",
    recoverySignOutError: "La contraseña fue actualizada. Cierra esta pestaña e inicia sesión nuevamente.",
    recoveryUpdating: "Actualizando…",
    recoveryResetSubmit: "Actualizar contraseña",
  },
  navigation: {
    main: "Navegación principal",
    openMenu: "Abrir navegación",
    feed: "Inicio",
    kids: "Niños",
    newPost: "Nueva publicación",
    home: "Inicio",
    staffSubtitle: "Sala Soles",
    familySubtitle: "Familias",
    admin: "Admin",
    staff: "Personal",
    family: "Familia",
    account: "Cuenta",
    logout: "Cerrar sesión",
  },
  feed: {
    daycareRoom: "GUARDERÍA · SALA {room}",
    daycareFeed: "GUARDERÍA · FEED",
    greeting: "Buenas, {name}",
    team: "equipo",
    updates: "Las novedades de tu comunidad",
    shareMoment: "Compartí un momento…",
    publications: "PUBLICACIONES",
    noPostsTitle: "Todavía no hay publicaciones",
    noPostsDescription: "Las novedades de tu sala aparecerán acá cuando el equipo comparta un momento.",
    audience: "Para: toda la sala {room}",
    postedByTeam: "publicado por el equipo",
    roomPost: "Publicación de sala",
    photo: "foto",
    photos: "fotos",
    viewPhoto: "Ver foto",
    previousPhoto: "Foto anterior",
    nextPhoto: "Foto siguiente",
    photoOfPublication: "Foto de la publicación",
    photoOfPublicationNumber: "Foto {number} de la publicación",
    photoCounter: "{current} de {total}",
  },
  posts: {
    cancel: "Cancelar",
    title: "Nueva publicación",
    publish: "Publicar",
    saving: "Guardando…",
    to: "PARA",
    wholeRoom: "Toda la sala {room}",
    selectRoom: "Seleccioná una sala",
    type: "TIPO",
    description: "DESCRIPCIÓN",
    descriptionPlaceholder: "Contá cómo le fue hoy…",
    photos: "FOTOS",
    add: "Agregar",
    photoLimits: "Hasta 6 fotos JPEG, PNG, WebP o GIF de 10 MB cada una.",
    uploadingPhoto: "Subiendo foto {current} de {total}…",
    removePhoto: "Eliminar foto {name}",
    noPhotosPrepared: "No se pudieron preparar todas las fotos.",
    photoUploadFailed: "No se pudo subir una de las fotos. Podés intentarlo de nuevo.",
    roomRequired: "Elegí una sala.",
    typeRequired: "Elegí un tipo de publicación.",
    descriptionRequired: "Contá cómo le fue hoy.",
    compatibleImage: "{name} no es una imagen compatible.",
    photoTooLarge: "{name} supera el límite de 10 MB.",
    maxPhotos: "Podés agregar hasta 6 fotos.",
  },
  kids: {
    management: "GESTIÓN",
    title: "Niños",
    addChild: "Agregar niño",
    activeChildren: "Activos",
    archivedChildren: "Archivados",
    searchChild: "Buscar niño",
    searchPlaceholder: "Buscar niño…",
    room: "SALA",
    child: "niño",
    children: "niños",
    noSearchResults: "No hay nombres que coincidan con la búsqueda.",
    noArchivedChildren: "No hay niños archivados en esta sala.",
    noChildren: "Todavía no hay niños en esta sala.",
    fullName: "NOMBRE COMPLETO",
    fullNamePlaceholder: "Ej. Martina López",
    birthDate: "FECHA DE NACIMIENTO",
    enrollmentDate: "FECHA DE INSCRIPCIÓN",
    allergies: "ALERGIAS (ETIQUETAS)",
    allergiesPlaceholder: "Ej. Maní, Lactosa",
    medicalNotes: "NOTAS MÉDICAS",
    medicalNotesPlaceholder: "Indicaciones, medicación, contactos…",
    photoConsent: "Autoriza fotografías",
    editChild: "Editar niño",
    editDescription: "Edita los datos y gestiona el estado de {name}.",
    saveChanges: "Guardar cambios",
    childManagement: "GESTIÓN DEL NIÑO",
    restoreChild: "Restaurar niño",
    archiveChild: "Archivar niño",
    permanentlyDelete: "Eliminar permanentemente",
    deleteConfirmationLabel: "Escribe {name} para eliminarlo",
    deleteConfirmationHint: "Escribe exactamente {name} para confirmar.",
    archiveConfirmation: "¿Archivar a {name}?",
    allergiesAndNotes: "Alergias y notas",
    allergiesSummary: "Alergias: {allergies}.",
    noAllergies: "Sin alergias registradas.",
    noMedicalNotes: "Sin notas médicas.",
    childDetailsBirthDate: "Fecha de nacimiento",
    childDetailsRoom: "Sala",
    childDetailsEnrollment: "Ingreso",
    childDetailsPhotoConsent: "Autoriza fotografías",
    childDetailsStatus: "Estado",
    linkParents: "PADRES VINCULADOS",
    linkParent: "Vincular padre",
    linkAnotherParent: "Vincular otro padre",
    invitationEditLabel: "Editar invitación de {name}",
    deliveryError: "Error de envío",
    expires: "Vence {date}",
    emailSent: "Correo enviado",
    noLinkedParents: "Todavía no hay padres vinculados.",
    noChildrenLoadedLabel: "NO PUDIMOS CARGAR",
    noChildrenLoadedTitle: "No se pudieron cargar los niños",
    noChildrenLoadedDescription: "Revisa tu conexión e inténtalo nuevamente.",
    noRoomAssigned: "No tenés una sala asignada",
    noRoomAssignedDescription: "Pedile a un administrador que te asigne una sala para poder publicar.",
    validation: {
      fullName: "Escribe el nombre completo.",
      birthDate: "Selecciona una fecha de nacimiento válida.",
      enrollmentDate: "Selecciona una fecha de inscripción válida.",
      enrollmentAfterToday: "La inscripción no puede ser posterior a hoy.",
      room: "Selecciona una sala válida.",
      birthBeforeEnrollment: "El nacimiento debe ser anterior a la inscripción.",
    },
  },
  invitations: {
    parentName: "NOMBRE DEL PADRE/MADRE",
    parentNamePlaceholder: "Ej. Diego Fernández",
    email: "EMAIL",
    emailPlaceholder: "correo@ejemplo.com",
    relationship: "PARENTESCO",
    mother: "Mamá",
    father: "Papá",
    guardian: "Tutor/a",
    sending: "Enviando invitación…",
    sentTitle: "¡Invitación enviada!",
    sentDescription: "Se envió un correo a {email} con el código de activación.",
    invitationCode: "CÓDIGO DE INVITACIÓN",
    expiresInSevenDays: "Vence en 7 días",
    close: "Cerrar",
    editDescription: "Actualiza los datos del padre. Deberás reenviar la invitación para que reciba la información nueva.",
    createDescription: "Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de {child}.",
    sendInvitation: "Enviar invitación",
    retryDelivery: "Reintentar envío",
    saveChanges: "Guardar cambios",
    sendingRetry: "Reintentando…",
  },
  pending: {
    title: "Acceso pendiente",
    description: "Tu cuenta todavía no tiene acceso al espacio de la guardería. Consultá con administración si necesitás ayuda.",
    reviewAccess: "Revisar acceso",
    logout: "Salir",
  },
  actions: {
    authorizationError: "No tienes permiso para gestionar niños.",
    activationError: "El código no es válido o ya no está disponible.",
    children: {
      loadRooms: "No se pudieron cargar las salas.",
      invalidView: "La vista de niños solicitada no es válida.",
      loadChildren: "No se pudieron cargar los niños.",
      loadChild: "No se pudo cargar el niño.",
      reviewFields: "Revisa los campos indicados.",
      saveChild: "No se pudo guardar el niño. Inténtalo de nuevo.",
      unavailableChild: "El niño no existe o no está disponible.",
      exactName: "Escribe el nombre exacto del niño para confirmar.",
      deleteChild: "No se pudo eliminar el niño. Inténtalo de nuevo.",
    },
    invitations: {
      generic: "No se pudo procesar la invitación. Revisa los datos e inténtalo nuevamente.",
      delivery: "La invitación se creó, pero no se pudo enviar el correo. Puedes reintentarlo.",
      cancellation: "No se pudo cancelar la invitación. Inténtalo nuevamente.",
      update: "No se pudo actualizar la invitación. Inténtalo nuevamente.",
      reviewFields: "Revisa los campos indicados.",
      loadParents: "No se pudieron cargar los padres vinculados.",
      loadInvitations: "No se pudieron cargar las invitaciones.",
      invalidName: "Ingresa un nombre válido.",
      invalidEmail: "Ingresa un email válido.",
      invalidRelationship: "Selecciona un parentesco válido.",
    },
    posts: {
      generic: "No se pudo guardar la publicación. Inténtalo de nuevo.",
      delete: "No se pudo eliminar la publicación. Inténtalo de nuevo.",
      photoConsent: "No se puede publicar fotos porque algún niño de la sala no tiene autorización para fotografías.",
      noActiveRecipients: "La sala no tiene niños activos para recibir la publicación.",
      roomAccess: "No tienes permiso para publicar en esa sala.",
      bodyRequired: "Escribe una descripción para la publicación.",
      typeRequired: "Elige un tipo de publicación.",
      photosInvalid: "Revisa las fotos seleccionadas y vuelve a intentarlo.",
      invalidPost: "La publicación no es válida.",
      roomRequired: "Selecciona una sala válida.",
      descriptionTooLong: "La descripción no puede superar los 5000 caracteres.",
      maxPhotos: "Podés agregar hasta 6 fotos.",
      invalidPhotos: "Una o más fotos no son válidas. Usa imágenes de hasta 10 MB.",
      createPermission: "No tienes permiso para crear publicaciones.",
      publishPermission: "No tienes permiso para publicar.",
      abortPermission: "No tienes permiso para cancelar esta publicación.",
      deletePermission: "No tienes permiso para eliminar esta publicación.",
      loadRooms: "No se pudieron cargar las salas para publicar.",
      loadAssignedRooms: "No se pudieron cargar tus salas.",
      loadFeed: "No se pudo cargar el feed.",
    },
  },
  email: {
    subject: "Invitación para seguir a {child} en OpenDayCare",
    heading: "Te invitaron a seguir el día de {child}",
    greeting: "Hola {name},",
    invitation: "{daycare} te invitó a vincularte como {relationship} con {child}.",
    activationCode: "Tu código de activación",
    activateAccount: "Activar mi cuenta",
    manualCode: "También podés abrir el enlace y escribir manualmente el código.",
    expires: "La invitación vence el {date} (UTC).",
    textActivation: "Activá tu cuenta: {url}",
    textCode: "Código de activación: {token}",
    textExpires: "La invitación vence el {date} (UTC), dentro de siete días.",
    textManualCode: "También podés abrir el enlace y escribir manualmente el código.",
  },
  postTypes: {
    meal: "Comida",
    nap: "Siesta",
    activity: "Actividad",
    achievement: "Logro",
    mood: "Ánimo",
    photo: "Foto",
    announcement: "Anuncio",
  },
};

const english: Dictionary = {
  locale: "en",
  metadata: { description: "Your daycare community" },
  language: {
    label: "Language",
    switchToSpanish: "Switch to Spanish",
    switchToEnglish: "Switch to English",
  },
  common: {
    cancel: "Cancel",
    close: "Close",
    save: "Save",
    saving: "Saving…",
    deleting: "Deleting…",
    retry: "Try again",
    backToFeed: "Back to feed",
    backToChildren: "Back to Children",
    loading: "Loading…",
    yes: "Yes",
    no: "No",
    active: "Active",
    pending: "Pending",
    archived: "Archived",
    year: "year",
    years: "years",
  },
  auth: {
    heroTitle: "Every child's day, shared with their family.",
    heroDescription: "Share moments, manage rooms, and keep families close, all in one place.",
    heroFooter: "Soles Room Daycare",
    loginTitle: "Sign in",
    loginSubtitle: "Sign in to see today's updates.",
    email: "EMAIL",
    password: "PASSWORD",
    passwordPlaceholder: "••••••••",
    forgotPassword: "Forgot your password?",
    login: "Sign in",
    loggingIn: "Signing in…",
    loginError: "The email or password is incorrect.",
    activationSuccess: "Your account was activated and the connection with the child was confirmed.",
    activationError: "Activation could not be completed. Check the link and try again.",
    activationPending: "Check your email to confirm your account and complete activation.",
    invitedPrompt: "Were you invited by the daycare?",
    activateAccount: "Activate your account",
    activationTitle: "Welcome to OpenDayCare",
    activationDescription: "You were invited to follow your child's day. Complete your details to activate your account.",
    blockedSession: "Sign out of the current session and reopen this link with the invited parent's account.",
    invitationCode: "INVITATION CODE",
    invitedEmail: "EMAIL THAT RECEIVED THE INVITATION",
    accountName: "NAME FOR YOUR ACCOUNT",
    createPassword: "CREATE PASSWORD",
    photoConsent: "I authorize the daycare to take and share photos of my child within the app.",
    activationValidation: "Enter the code, email, name, and password (at least 8 characters).",
    activationExistingValidation: "Enter the invitation code and your name.",
    processing: "Processing…",
    acceptInvitation: "Accept invitation",
    activateMyAccount: "Activate my account",
    alreadyHaveAccount: "Already have an account?",
    recoverySuccess: "Your password has been updated. You can now sign in.",
    recoveryInvalidLink: "This recovery link is invalid or has expired. Please request a new one.",
    recoveryTitle: "Reset your password",
    recoveryDescription: "Enter your email and we will send you instructions to create a new password.",
    recoveryEmailInvalid: "Enter a valid email address.",
    recoveryRequestError: "We couldn't process the request. Please try again.",
    recoveryRequestSuccess: "If an account exists for that email, you will receive a link to reset your password. Also check your spam folder.",
    recoverySending: "Sending…",
    recoverySubmit: "Send instructions",
    recoveryBackToLogin: "Back to sign in",
    recoveryResetTitle: "Create a new password",
    recoveryResetDescription: "Choose a new password to get back into your account.",
    recoveryNewPassword: "NEW PASSWORD",
    recoveryConfirmPassword: "CONFIRM PASSWORD",
    recoveryVerifying: "Verifying your recovery link…",
    recoveryPasswordTooShort: "The password must be at least 8 characters long.",
    recoveryPasswordMismatch: "The passwords don't match.",
    recoveryUpdateError: "We couldn't update the password. Please request a new link and try again.",
    recoveryCleanupError: "Your password was updated, but we couldn't close this recovery link. Close this tab and sign in again.",
    recoverySignOutError: "Your password was updated. Close this tab and sign in again.",
    recoveryUpdating: "Updating…",
    recoveryResetSubmit: "Update password",
  },
  navigation: {
    main: "Main navigation",
    openMenu: "Open navigation",
    feed: "Feed",
    kids: "Children",
    newPost: "New post",
    home: "Home",
    staffSubtitle: "Soles Room",
    familySubtitle: "Families",
    admin: "Admin",
    staff: "Staff",
    family: "Family",
    account: "Account",
    logout: "Sign out",
  },
  feed: {
    daycareRoom: "DAYCARE · ROOM {room}",
    daycareFeed: "DAYCARE · FEED",
    greeting: "Hello, {name}",
    team: "team",
    updates: "Updates from your community",
    shareMoment: "Share a moment…",
    publications: "POSTS",
    noPostsTitle: "There are no posts yet",
    noPostsDescription: "Updates from your room will appear here when the team shares a moment.",
    audience: "For: the whole {room} room",
    postedByTeam: "posted by the team",
    roomPost: "Room post",
    photo: "photo",
    photos: "photos",
    viewPhoto: "View photo",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
    photoOfPublication: "Photo from the post",
    photoOfPublicationNumber: "Photo {number} from the post",
    photoCounter: "{current} of {total}",
  },
  posts: {
    cancel: "Cancel",
    title: "New post",
    publish: "Publish",
    saving: "Saving…",
    to: "TO",
    wholeRoom: "Whole {room} room",
    selectRoom: "Select a room",
    type: "TYPE",
    description: "DESCRIPTION",
    descriptionPlaceholder: "Tell us how the day went…",
    photos: "PHOTOS",
    add: "Add",
    photoLimits: "Up to 6 JPEG, PNG, WebP, or GIF photos, 10 MB each.",
    uploadingPhoto: "Uploading photo {current} of {total}…",
    removePhoto: "Remove photo {name}",
    noPhotosPrepared: "Not all photos could be prepared.",
    photoUploadFailed: "One of the photos could not be uploaded. Please try again.",
    roomRequired: "Choose a room.",
    typeRequired: "Choose a post type.",
    descriptionRequired: "Tell us how the day went.",
    compatibleImage: "{name} is not a supported image.",
    photoTooLarge: "{name} exceeds the 10 MB limit.",
    maxPhotos: "You can add up to 6 photos.",
  },
  kids: {
    management: "MANAGEMENT",
    title: "Children",
    addChild: "Add child",
    activeChildren: "Active",
    archivedChildren: "Archived",
    searchChild: "Search for a child",
    searchPlaceholder: "Search for a child…",
    room: "ROOM",
    child: "child",
    children: "children",
    noSearchResults: "No names match your search.",
    noArchivedChildren: "There are no archived children in this room.",
    noChildren: "There are no children in this room yet.",
    fullName: "FULL NAME",
    fullNamePlaceholder: "e.g. Martina López",
    birthDate: "DATE OF BIRTH",
    enrollmentDate: "ENROLLMENT DATE",
    allergies: "ALLERGIES (TAGS)",
    allergiesPlaceholder: "e.g. Peanuts, Lactose",
    medicalNotes: "MEDICAL NOTES",
    medicalNotesPlaceholder: "Instructions, medication, contacts…",
    photoConsent: "Photo consent granted",
    editChild: "Edit child",
    editDescription: "Edit the details and manage the status of {name}.",
    saveChanges: "Save changes",
    childManagement: "CHILD MANAGEMENT",
    restoreChild: "Restore child",
    archiveChild: "Archive child",
    permanentlyDelete: "Delete permanently",
    deleteConfirmationLabel: "Type {name} to delete this child",
    deleteConfirmationHint: "Type exactly {name} to confirm.",
    archiveConfirmation: "Archive {name}?",
    allergiesAndNotes: "Allergies and notes",
    allergiesSummary: "Allergies: {allergies}.",
    noAllergies: "No allergies recorded.",
    noMedicalNotes: "No medical notes.",
    childDetailsBirthDate: "Date of birth",
    childDetailsRoom: "Room",
    childDetailsEnrollment: "Enrolled",
    childDetailsPhotoConsent: "Photo consent",
    childDetailsStatus: "Status",
    linkParents: "LINKED PARENTS",
    linkParent: "Link parent",
    linkAnotherParent: "Link another parent",
    invitationEditLabel: "Edit invitation for {name}",
    deliveryError: "Delivery error",
    expires: "Expires {date}",
    emailSent: "Email sent",
    noLinkedParents: "There are no linked parents yet.",
    noChildrenLoadedLabel: "COULD NOT LOAD",
    noChildrenLoadedTitle: "Children could not be loaded",
    noChildrenLoadedDescription: "Check your connection and try again.",
    noRoomAssigned: "No room assigned",
    noRoomAssignedDescription: "Ask an administrator to assign you a room so you can post.",
    validation: {
      fullName: "Enter the full name.",
      birthDate: "Select a valid date of birth.",
      enrollmentDate: "Select a valid enrollment date.",
      enrollmentAfterToday: "Enrollment cannot be later than today.",
      room: "Select a valid room.",
      birthBeforeEnrollment: "Birth must be earlier than enrollment.",
    },
  },
  invitations: {
    parentName: "PARENT NAME",
    parentNamePlaceholder: "e.g. Diego Fernández",
    email: "EMAIL",
    emailPlaceholder: "email@example.com",
    relationship: "RELATIONSHIP",
    mother: "Mother",
    father: "Father",
    guardian: "Guardian",
    sending: "Sending invitation…",
    sentTitle: "Invitation sent!",
    sentDescription: "An email with the activation code was sent to {email}.",
    invitationCode: "INVITATION CODE",
    expiresInSevenDays: "Expires in 7 days",
    close: "Close",
    editDescription: "Update the parent's details. You will need to resend the invitation for them to receive the new information.",
    createDescription: "We will send an email with a code to activate the account. They will only see {child}'s feed.",
    sendInvitation: "Send invitation",
    retryDelivery: "Retry delivery",
    saveChanges: "Save changes",
    sendingRetry: "Retrying…",
  },
  pending: {
    title: "Access pending",
    description: "Your account does not have access to the daycare space yet. Contact an administrator if you need help.",
    reviewAccess: "Check access",
    logout: "Sign out",
  },
  actions: {
    authorizationError: "You do not have permission to manage children.",
    activationError: "The code is invalid or no longer available.",
    children: {
      loadRooms: "Rooms could not be loaded.",
      invalidView: "The requested children view is invalid.",
      loadChildren: "Children could not be loaded.",
      loadChild: "The child could not be loaded.",
      reviewFields: "Review the indicated fields.",
      saveChild: "The child could not be saved. Please try again.",
      unavailableChild: "The child does not exist or is no longer available.",
      exactName: "Type the child's exact name to confirm.",
      deleteChild: "The child could not be deleted. Please try again.",
    },
    invitations: {
      generic: "The invitation could not be processed. Check the details and try again.",
      delivery: "The invitation was created, but the email could not be sent. You can retry it.",
      cancellation: "The invitation could not be canceled. Please try again.",
      update: "The invitation could not be updated. Please try again.",
      reviewFields: "Review the indicated fields.",
      loadParents: "Linked parents could not be loaded.",
      loadInvitations: "Invitations could not be loaded.",
      invalidName: "Enter a valid name.",
      invalidEmail: "Enter a valid email.",
      invalidRelationship: "Select a valid relationship.",
    },
    posts: {
      generic: "The post could not be saved. Please try again.",
      delete: "The post could not be deleted. Please try again.",
      photoConsent: "Photos cannot be posted because a child in the room does not have photo consent.",
      noActiveRecipients: "The room has no active children to receive the post.",
      roomAccess: "You do not have permission to post in that room.",
      bodyRequired: "Write a description for the post.",
      typeRequired: "Choose a post type.",
      photosInvalid: "Review the selected photos and try again.",
      invalidPost: "The post is invalid.",
      roomRequired: "Select a valid room.",
      descriptionTooLong: "The description cannot exceed 5,000 characters.",
      maxPhotos: "You can add up to 6 photos.",
      invalidPhotos: "One or more photos are invalid. Use images up to 10 MB.",
      createPermission: "You do not have permission to create posts.",
      publishPermission: "You do not have permission to publish.",
      abortPermission: "You do not have permission to cancel this post.",
      deletePermission: "You do not have permission to delete this post.",
      loadRooms: "Rooms could not be loaded for posting.",
      loadAssignedRooms: "Your rooms could not be loaded.",
      loadFeed: "The feed could not be loaded.",
    },
  },
  email: {
    subject: "Invitation to follow {child} on OpenDayCare",
    heading: "You were invited to follow {child}'s day",
    greeting: "Hello {name},",
    invitation: "{daycare} invited you to connect as {relationship} with {child}.",
    activationCode: "Your activation code",
    activateAccount: "Activate my account",
    manualCode: "You can also open the link and enter the code manually.",
    expires: "The invitation expires on {date} (UTC).",
    textActivation: "Activate your account: {url}",
    textCode: "Activation code: {token}",
    textExpires: "The invitation expires on {date} (UTC), within seven days.",
    textManualCode: "You can also open the link and enter the code manually.",
  },
  postTypes: {
    meal: "Meal",
    nap: "Nap",
    activity: "Activity",
    achievement: "Achievement",
    mood: "Mood",
    photo: "Photo",
    announcement: "Announcement",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { es: spanish, en: english };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function interpolate(
  template: string,
  values: Record<string, string | number> = {},
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function getIntlLocale(locale: Locale) {
  return locale === "es" ? "es-AR" : "en-US";
}

export function formatDate(
  value: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {},
) {
  const normalizedValue = value.includes("T") ? value : `${value}T00:00:00.000Z`;

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    timeZone: "America/Argentina/Buenos_Aires",
    ...options,
  }).format(new Date(normalizedValue));
}

export function formatAge(value: string, locale: Locale, singular?: string, plural?: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;

  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) {
    age--;
  }

  const dictionary = getDictionary(locale);
  return `${age} ${age === 1 ? singular ?? dictionary.common.year : plural ?? dictionary.common.years}`;
}
