// As variáveis globais __app_id, __firebase_config e __initial_auth_token
// são fornecidas pelo ambiente do Canvas.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

// Importa as funções do Firebase que serão utilizadas
const { initializeApp } = firebase;
const { getFirestore, doc, setDoc, getDoc } = firebase.firestore;
const { getAuth, signInAnonymously } = firebase.auth;

let app;
let db;
let auth;
let userId;

// Função de inicialização do Firebase e autenticação
const initializeFirebase = async () => {
    try {
        if (Object.keys(firebaseConfig).length > 0) {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            
            // Autentica o usuário anonimamente para ter permissões de escrita
            await signInAnonymously(auth);
            userId = auth.currentUser.uid;
            
            console.log("Firebase e autenticação inicializados com sucesso!");
            
            // Carrega os dados para o formulário após a inicialização
            loadData();
        } else {
            console.error("Configuração do Firebase não encontrada. Verifique as variáveis do ambiente.");
        }
    } catch (error) {
        console.error("Erro ao inicializar o Firebase ou autenticar:", error);
    }
};

// Carrega os dados do Firestore e preenche os campos do formulário
const loadData = async () => {
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/config/content`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Dados carregados com sucesso:", data);
            
            // Preenche os campos de texto do formulário
            document.getElementById('header-title').value = data.headerTitle || '';
            document.getElementById('header-subtitle').value = data.headerSubtitle || '';
            document.getElementById('chopp-section-title').value = data.choppSectionTitle || '';
            document.getElementById('supplies-section-title').value = data.suppliesSectionTitle || '';
            document.getElementById('rental-section-title').value = data.rentalSectionTitle || '';
            document.getElementById('calculator-section-title').value = data.calculatorSectionTitle || '';
            document.getElementById('footer-text').value = data.footerText || '';
            document.getElementById('footer-contact-title').value = data.footerContactTitle || '';
            document.getElementById('footer-phone').value = data.footerPhone || '';
            document.getElementById('footer-email').value = data.footerEmail || '';
            document.getElementById('footer-address').value = data.footerAddress || '';
            
        } else {
            console.log("Nenhum dado encontrado. O formulário está vazio.");
        }
    } catch (e) {
        console.error("Erro ao ler os dados do Firestore:", e);
    }
};

// Função para salvar os dados do formulário no Firestore
const saveData = async (event) => {
    event.preventDefault();
    const statusMessage = document.getElementById('status-message');
    statusMessage.classList.add('hidden');

    try {
        const data = {
            headerTitle: document.getElementById('header-title').value,
            headerSubtitle: document.getElementById('header-subtitle').value,
            choppSectionTitle: document.getElementById('chopp-section-title').value,
            suppliesSectionTitle: document.getElementById('supplies-section-title').value,
            rentalSectionTitle: document.getElementById('rental-section-title').value,
            calculatorSectionTitle: document.getElementById('calculator-section-title').value,
            footerText: document.getElementById('footer-text').value,
            footerContactTitle: document.getElementById('footer-contact-title').value,
            footerPhone: document.getElementById('footer-phone').value,
            footerEmail: document.getElementById('footer-email').value,
            footerAddress: document.getElementById('footer-address').value,
        };

        const docRef = doc(db, `artifacts/${appId}/users/${userId}/config/content`);
        await setDoc(docRef, data, { merge: true });

        statusMessage.textContent = 'Alterações salvas com sucesso!';
        statusMessage.classList.remove('hidden');
        statusMessage.classList.add('text-green-600');
        console.log("Documento gravado com ID: ", docRef.id);
    } catch (e) {
        statusMessage.textContent = 'Erro ao salvar: ' + e.message;
        statusMessage.classList.remove('hidden');
        statusMessage.classList.add('text-red-600');
        console.error("Erro ao adicionar documento: ", e);
    }
};

// Inicializa o Firebase ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    document.getElementById('admin-form').addEventListener('submit', saveData);
});
