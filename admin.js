import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let currentData = {};
const adminForm = document.getElementById('admin-form');
const statusMessage = document.getElementById('status-message');

const createProductFields = (products, container) => {
    container.innerHTML = '';
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'bg-gray-50 p-4 rounded-md shadow-inner space-y-2';
        
        let priceUnit = product.unit || ' / litro';
        if (product.id === 'grill') {
            priceUnit = ' / diária';
        }

        const priceId = product.price ? 'price' : 'pricePerLiter';
        const priceValue = product.price ? product.price : product.pricePerLiter;

        productDiv.innerHTML = `
            <h3 class="font-medium text-gray-800">${product.name}</h3>
            <div>
                <label for="${product.id}-name" class="block text-xs font-medium text-gray-500">Nome</label>
                <input type="text" id="${product.id}-name" name="${product.id}-name" value="${product.name}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm">
            </div>
            <div>
                <label for="${product.id}-${priceId}" class="block text-xs font-medium text-gray-500">Preço</label>
                <input type="number" id="${product.id}-${priceId}" name="${product.id}-${priceId}" value="${priceValue}" step="0.01" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm">
                <span class="text-xs text-gray-400">${priceUnit}</span>
            </div>
            <div class="flex items-center space-x-2">
                <input type="checkbox" id="${product.id}-hidden" name="${product.id}-hidden" ${product.hidden ? 'checked' : ''} class="rounded text-red-600">
                <label for="${product.id}-hidden" class="text-xs font-medium text-gray-700">Ocultar produto no site</label>
            </div>
        `;
        container.appendChild(productDiv);
    });
};

const populateForm = (data) => {
    currentData = data;
    const texts = data.texts || {};
    const products = data.products || { chopps: [], supplies: [], rentals: [] };

    // Preenche campos de texto
    for (const key in texts) {
        const input = document.getElementById(key);
        if (input) {
            input.value = texts[key];
        }
    }

    // Preenche campos de produtos dinamicamente
    const container = document.getElementById('product-prices-container');
    container.innerHTML = '';
    
    // Adiciona o título para a seção de Chopps
    const choppsTitle = document.createElement('h3');
    choppsTitle.className = 'text-xl font-semibold mt-6 mb-2';
    choppsTitle.textContent = 'Chopps';
    container.appendChild(choppsTitle);
    
    createProductFields(products.chopps, container);

    // Adiciona o título para a seção de Outros Produtos
    const suppliesTitle = document.createElement('h3');
    suppliesTitle.className = 'text-xl font-semibold mt-6 mb-2';
    suppliesTitle.textContent = 'Outros Produtos e Locação';
    container.appendChild(suppliesTitle);

    createProductFields([...products.supplies, ...products.rentals], container);
};

adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    statusMessage.textContent = 'Salvando...';
    statusMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');
    statusMessage.classList.add('text-gray-600');

    try {
        const formData = new FormData(adminForm);
        const newData = {
            texts: {},
            products: {
                chopps: JSON.parse(JSON.stringify(currentData.products.chopps)),
                supplies: JSON.parse(JSON.stringify(currentData.products.supplies)),
                rentals: JSON.parse(JSON.stringify(currentData.products.rentals))
            },
            lastUpdated: serverTimestamp()
        };

        // Coleta textos
        for (const key in currentData.texts) {
            newData.texts[key] = formData.get(key);
        }

        // Coleta preços e status de visibilidade
        [...newData.products.chopps, ...newData.products.supplies, ...newData.products.rentals].forEach(product => {
            product.name = formData.get(`${product.id}-name`);
            if (product.price) {
                product.price = parseFloat(formData.get(`${product.id}-price`));
            } else if (product.pricePerLiter) {
                product.pricePerLiter = parseFloat(formData.get(`${product.id}-pricePerLiter`));
            }
            product.hidden = formData.get(`${product.id}-hidden`) === 'on';
        });

        // Atualiza o documento no Firestore
        const dataDocRef = doc(db, `artifacts/${appId}/public/data/site-data`);
        await setDoc(dataDocRef, newData);

        statusMessage.textContent = 'Alterações salvas com sucesso!';
        statusMessage.classList.remove('text-gray-600', 'hidden');
        statusMessage.classList.add('text-green-600');
    } catch (error) {
        console.error("Erro ao salvar o documento:", error);
        statusMessage.textContent = 'Erro ao salvar. Tente novamente.';
        statusMessage.classList.remove('text-gray-600', 'hidden');
        statusMessage.classList.add('text-red-600');
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        
        const dataDocRef = doc(db, `artifacts/${appId}/public/data/site-data`);
        
        onSnapshot(dataDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                populateForm(docSnapshot.data());
            } else {
                console.log("Documento não encontrado. Recarregue a página principal para inicializar os dados.");
                statusMessage.textContent = 'Dados não encontrados. Recarregue a página principal primeiro.';
                statusMessage.classList.remove('hidden');
                statusMessage.classList.add('text-red-600');
            }
        }, (error) => {
            console.error("Erro na escuta de dados: ", error);
        });

    } catch (error) {
        console.error("Erro de autenticação ou conexão com o Firestore:", error);
    }
});
