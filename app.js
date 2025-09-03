import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, setLogLevel } from 'firebase/firestore';
import { Home, Beer, Settings, PlusCircle, Trash2, Edit2, Save, XCircle } from 'lucide-react';

// Ativa logs de depuração para o Firestore
setLogLevel('Debug');

// 🔑 Identificação do app
const appId = "default-app-id"; // mantenha esse mesmo, pois o Firestore foi montado nesse caminho

// 🔥 Configuração do Firebase (sua)
const firebaseConfig = {
  apiKey: "AIzaSyCMiU9pBhXni7st0Csho9I8asGxcXTrpI4",
  authDomain: "chopp-do-claudinho-8ac80.firebaseapp.com",
  projectId: "chopp-do-claudinho-8ac80",
  storageBucket: "chopp-do-claudinho-8ac80.firebasestorage.app",
  messagingSenderId: "912741573875",
  appId: "1:912741573875:web:64163117540725ffc6c386"
};

// Dados iniciais para o caso de o banco de dados estar vazio
const initialData = {
    texts: {
        headerTitle: "Chopp do Claudinho",
        headerSubtitle: "Sua distribuidora de chopp e suprimentos para festas!",
        choppSectionTitle: "Chopps Especiais",
        suppliesSectionTitle: "Outros Produtos",
        rentalSectionTitle: "Locação",
        calculatorSectionTitle: "Calcule sua festa",
        footerText: "* Consulte a taxa de entrega para a sua região.",
        footerContactTitle: "Entre em Contato",
        footerPhone: "(18) 98173-0244",
        footerEmail: "claudioappfreitas@gmail.com",
        footerAddress: "Av. Joaquim Constantino, 1882 - Vila Nova Prudente",
        logoUrl: "https://placehold.co/150x50/ee1d23/ffffff?text=Logo"
    },
    categories: [
        { id: 'chopps', name: 'Chopps Especiais' },
        { id: 'supplies', name: 'Outros Produtos' },
        { id: 'rentals', name: 'Locação' }
    ],
    products: {
        chopps: [
            { id: 'pilsen', name: 'Chopp Pilsen', price: 10.00, isChopp: true, barrelSizes: [30, 50] },
            { id: 'brahma', name: 'Chopp Brahma', price: 18.00, isChopp: true, barrelSizes: [30, 50] },
            { id: 'ipa', name: 'Chopp IPA', price: 15.00, isChopp: true, barrelSizes: [10, 20, 30, 50] },
            { id: 'vinho', name: 'Chopp Vinho', price: 15.00, isChopp: true, barrelSizes: [10, 20, 30, 50] }
        ],
        supplies: [
            { id: 'charcoal', name: 'Carvão', price: 50.00 },
            { id: 'cubed-ice', name: 'Gelo em Cubo', price: 12.00 }
        ],
        rentals: [
            { id: 'thermal-box', name: 'Caixa Térmica', price: 150.00 },
            { id: 'tables', name: 'Jogo de Mesa', price: 15.00 },
            { id: 'grill', name: 'Churrasqueira', price: 150.00 }
        ]
    }
};

// 🔔 Toast de notificação
const Toast = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className={`fixed bottom-8 right-8 ${bgColor} text-white px-6 py-4 rounded-full shadow-lg transition-all duration-300 transform`}>
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
                <XCircle size={18} />
            </button>
        </div>
    );
};

// 🔒 Diálogo de confirmação
const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto">
                <p className="text-gray-800 text-lg mb-4">{message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                        Não
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-[#ee1d23] text-white rounded-lg hover:bg-red-600 transition-colors">
                        Sim
                    </button>
                </div>
            </div>
        </div>
    );
};

// (mantém os outros componentes: Sidebar, HeaderSection, CatalogSection, SettingsSection iguais ao seu código atual)

// Componente principal da aplicação
const App = () => {
    const [activeTab, setActiveTab] = useState('header');
    const [data, setData] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestore);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                await signInAnonymously(firebaseAuth); // login anônimo por enquanto
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (db && userId) {
            const docRef = doc(db, `artifacts/${appId}/public/data/chopp-data/config`);
            const unsubscribe = onSnapshot(docRef, async (docSnap) => {
                if (docSnap.exists()) {
                    setData(docSnap.data());
                } else {
                    await setDoc(docRef, initialData);
                    setData(initialData);
                }
                setLoading(false);
            }, (error) => {
                console.error("Erro ao ler dados do Firestore:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [db, userId]);

    const saveData = async (newData) => {
        if (!db || !userId) {
            console.error("Banco de dados não inicializado ou usuário não autenticado.");
            return;
        }
        try {
            const docRef = doc(db, `artifacts/${appId}/public/data/chopp-data/config`);
            await setDoc(docRef, newData, { merge: true });
            console.log("Dados salvos com sucesso no Firestore.");
        } catch (error) {
            console.error("Erro ao salvar dados no Firestore:", error);
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div className="text-center text-xl text-gray-500 mt-20">Carregando...</div>;
        }

        if (!data) {
            return <div className="text-center text-xl text-red-500 mt-20">Erro ao carregar os dados. Tente recarregar a página.</div>;
        }

        switch (activeTab) {
            case 'header':
                return <HeaderSection data={data} onSave={saveData} />;
            case 'catalog':
                return <CatalogSection data={data} onSave={saveData} />;
            case 'settings':
                return <SettingsSection data={data} onSave={saveData} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userId={userId || "Carregando..."} />
            <main className="flex-1 ml-64 p-8">
                <h1 className="text-4xl font-bold text-gray-800 mb-8">Gerenciamento do Site</h1>
                {renderContent()}
            </main>
        </div>
    );
};

export default App;
