import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, getDocs, setDoc, addDoc, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let dataLoaded = false;
let pricesPerLiter = {};
let equipmentPrices = {};
let choppList = [];
let suppliesList = [];
let rentalList = [];

// Funções para carregar e atualizar o conteúdo do site
const loadContent = (data) => {
    // Carrega textos
    const texts = data.texts || {};
    document.getElementById('header-title').textContent = texts['header-title'] || 'Chopp do Claudinho';
    document.getElementById('header-subtitle').textContent = texts['header-subtitle'] || 'Sua distribuidora de chopp e suprimentos para festas!';
    document.getElementById('chopp-section-title').textContent = texts['chopp-section-title'] || 'Chopps Especiais';
    document.getElementById('supplies-section-title').textContent = texts['supplies-section-title'] || 'Outros Produtos';
    document.getElementById('rental-section-title').textContent = texts['rental-section-title'] || 'Locação';
    document.getElementById('calculator-section-title').textContent = texts['calculator-section-title'] || 'Calcule sua festa';
    document.getElementById('footer-text').textContent = texts['footer-text'] || '* Consulte a taxa de entrega para a sua região.';
    document.getElementById('footer-contact-title').textContent = texts['footer-contact-title'] || 'Entre em Contato';
    document.getElementById('footer-phone').textContent = texts['footer-phone'] || 'Telefone: (18) 98173-0244';
    document.getElementById('footer-email').textContent = texts['footer-email'] || 'E-mail: claudioappfreitas@gmail.com';
    document.getElementById('footer-address').textContent = texts['footer-address'] || 'Endereço: Av. Joaquim Constantino, 1882 - Vila Nova Prudente';

    // Carrega produtos
    const products = data.products || { chopps: [], supplies: [], rentals: [] };
    choppList = products.chopps;
    suppliesList = products.supplies;
    rentalList = products.rentals;

    // Converte os preços para facilitar o cálculo
    pricesPerLiter = {};
    choppList.forEach(chopp => {
        if (chopp.pricePerLiter) {
            pricesPerLiter[chopp.id] = chopp.pricePerLiter;
        }
    });
    
    equipmentPrices = {};
    [...suppliesList, ...rentalList].forEach(item => {
        if (item.price) {
            equipmentPrices[item.id] = item.price;
        }
    });
    
    renderProducts();
    renderCalculatorOptions();
};

const renderProducts = () => {
    const choppContainer = document.getElementById('chopp-products');
    const suppliesContainer = document.getElementById('supplies-products');
    const rentalContainer = document.getElementById('rental-products');

    choppContainer.innerHTML = '';
    suppliesContainer.innerHTML = '';
    rentalContainer.innerHTML = '';

    choppList.forEach(chopp => {
        if (!chopp.hidden) {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-md p-6 text-center transition-transform transform hover:scale-105';
            card.innerHTML = `
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">${chopp.name}</h3>
                <p class="text-sm mt-2 text-gray-600">R$ ${chopp.pricePerLiter.toFixed(2).replace('.', ',')} / litro</p>
                <div class="mt-4 flex justify-center space-x-2">
                    ${chopp.barrelSizes.map(size => `<button class="btn-barrel bg-[#ee1d23] text-white py-2 px-4 rounded-full font-semibold transition-colors duration-200" data-chopp="${chopp.id}" data-liters="${size}">${size} Litros</button>`).join('')}
                </div>
                <div class="chopp-total mt-4 space-y-1"></div>
            `;
            choppContainer.appendChild(card);
        }
    });

    suppliesList.forEach(supply => {
        if (!supply.hidden) {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-md p-6 text-center transition-transform transform hover:scale-105';
            card.innerHTML = `
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">${supply.name}</h3>
                <p class="text-xl font-bold text-[#ee1d23]">R$ ${supply.price.toFixed(2).replace('.', ',')} <span class="text-base font-normal">${supply.unit}</span></p>
            `;
            suppliesContainer.appendChild(card);
        }
    });

    rentalList.forEach(rental => {
        if (!rental.hidden) {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-md p-6 text-center transition-transform transform hover:scale-105';
            card.innerHTML = `
                <h3 class="text-2xl font-semibold text-gray-800 mb-2">${rental.name}</h3>
                <p class="text-xl font-bold text-[#ee1d23]">R$ ${rental.price.toFixed(2).replace('.', ',')} <span class="text-base font-normal">${rental.unit}</span></p>
            `;
            rentalContainer.appendChild(card);
        }
    });

    attachBarrelButtonListeners();
};

const renderCalculatorOptions = () => {
    const choppSelectionContainer = document.getElementById('chopp-selection');
    const otherItemsContainer = document.getElementById('other-items-section');
    choppSelectionContainer.innerHTML = '';
    otherItemsContainer.innerHTML = '';

    choppList.forEach(chopp => {
        if (!chopp.hidden) {
            const label = document.createElement('label');
            label.className = 'flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-200 bg-[#ee1d23] text-white';
            label.id = `chopp-${chopp.id}-label`;
            label.innerHTML = `<input type="checkbox" id="chopp-${chopp.id}" class="hidden"><span class="font-medium text-center w-full">${chopp.name}</span>`;
            choppSelectionContainer.appendChild(label);
        }
    });

    [...suppliesList, ...rentalList].forEach(item => {
        if (!item.hidden && item.includable) {
            const itemHtml = `
                <div class="flex items-center justify-between">
                    <label class="text-lg font-medium text-gray-700 flex items-center">
                        <input type="checkbox" id="check-${item.id}" class="h-5 w-5 text-[#ee1d23] rounded-md focus:ring-[#ee1d23] mr-2">
                        <span>${item.question}</span>
                    </label>
                    <div class="items-center space-x-2 counter-group" id="counter-${item.id}">
                        <button type="button" class="counter-btn" data-target="need-${item.id}" data-action="decrement">-</button>
                        <input type="number" id="need-${item.id}" value="0" min="0" class="counter-display rounded-md border-gray-300">
                        <button type="button" class="counter-btn" data-target="need-${item.id}" data-action="increment">+</button>
                    </div>
                </div>
            `;
            otherItemsContainer.innerHTML += itemHtml;
        }
    });

    attachCalculatorListeners();
};

const attachBarrelButtonListeners = () => {
    const barrelButtons = document.querySelectorAll('.btn-barrel');
    barrelButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const choppId = event.target.dataset.chopp;
            const liters = parseInt(event.target.dataset.liters);
            const pricePerLiter = pricesPerLiter[choppId];
            const totalCost = liters * pricePerLiter;
            const installment = totalCost / 3;

            const parentDiv = event.target.closest('.rounded-xl');
            const buttonsInParent = parentDiv.querySelectorAll('.btn-barrel');
            buttonsInParent.forEach(btn => {
                btn.classList.remove('bg-white', 'text-black', 'shadow-md');
                btn.classList.add('bg-[#ee1d23]', 'text-white');
            });
            
            event.target.classList.remove('bg-[#ee1d23]', 'text-white');
            event.target.classList.add('bg-white', 'text-black', 'shadow-md');

            const totalDisplay = parentDiv.querySelector('.chopp-total');
            totalDisplay.innerHTML = `
                <p class="text-xl font-bold text-[#ee1d23]">Total: R$ ${totalCost.toFixed(2).replace('.', ',')}</p>
                <p class="text-base font-normal text-[#ee1d23]">ou 3x de R$ ${installment.toFixed(2).replace('.', ',')}</p>
            `;
        });
    });
};

const attachCalculatorListeners = () => {
    const choppCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="chopp-"]');
    const otherCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="check-"]');
    const counterButtons = document.querySelectorAll('.counter-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const formalizeBtn = document.getElementById('formalize-btn');
    let lastCalculatedBudget = '';

    const updateChoppButtonStyles = () => {
        choppCheckboxes.forEach(checkbox => {
            const label = document.getElementById(checkbox.id + '-label');
            if (label) {
                if (checkbox.checked) {
                    label.classList.remove('bg-[#ee1d23]', 'text-white');
                    label.classList.add('bg-white', 'text-black', 'shadow-md');
                } else {
                    label.classList.remove('bg-white', 'text-black', 'shadow-md');
                    label.classList.add('bg-[#ee1d23]', 'text-white');
                }
            }
        });
    };

    const findBestBarrel = (requiredLiters, choppId) => {
        const chopp = choppList.find(c => c.id === choppId);
        if (!chopp || !chopp.barrelSizes) return 0;
        const sortedSizes = chopp.barrelSizes.sort((a, b) => a - b);
        for (const size of sortedSizes) {
            if (size >= requiredLiters) {
                return size;
            }
        }
        const baseBarrel = 30;
        return Math.ceil(requiredLiters / baseBarrel) * baseBarrel;
    };

    choppCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateChoppButtonStyles);
    });

    otherCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const itemId = event.target.id.replace('check-', '');
            const counterGroup = document.getElementById(`counter-${itemId}`);
            const isChecked = event.target.checked;
            
            if (counterGroup) {
                 if (isChecked) {
                    counterGroup.classList.add('active');
                    const input = document.getElementById(`need-${itemId}`);
                    if (input) {
                        let totalPeople = (parseInt(document.getElementById('drinking-adults').value) || 0) +
                                        (parseInt(document.getElementById('non-drinking-adults').value) || 0) +
                                        (parseInt(document.getElementById('children').value) || 0);
                        let value = 1;
                        switch(itemId) {
                            case 'tables':
                                value = Math.ceil(totalPeople / 4);
                                break;
                            case 'grill':
                                // Autoseleciona carvão
                                const charcoalCheckbox = document.getElementById('check-charcoal');
                                if (charcoalCheckbox) {
                                  charcoalCheckbox.checked = true;
                                  document.getElementById('counter-charcoal').classList.add('active');
                                  document.getElementById('need-charcoal').value = 1;
                                }
                                break;
                            case 'charcoal':
                                const grillChecked = document.getElementById('check-grill')?.checked;
                                value = grillChecked ? (parseInt(document.getElementById('need-grill').value) || 1) : 1;
                                break;
                            case 'cubed-ice':
                                const drinkingAdults = parseInt(document.getElementById('drinking-adults').value) || 0;
                                value = Math.ceil(drinkingAdults / 20);
                                break;
                            default:
                                value = 1;
                                break;
                        }
                        input.value = value > 0 ? value : 1;
                    }
                } else {
                    counterGroup.classList.remove('active');
                    const input = document.getElementById(`need-${itemId}`);
                    if (input) {
                        input.value = 0;
                    }
                }
            }
        });
    });

    counterButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const targetId = event.target.dataset.target;
            const action = event.target.dataset.action;
            const input = document.getElementById(targetId);
            let value = parseInt(input.value);

            if (action === 'increment') {
                value++;
            } else if (action === 'decrement' && value > 0) {
                value--;
            }
            input.value = value;
        });
    });

    calculateBtn.addEventListener('click', () => {
        let totalBudget = 0;
        let budgetSummary = '';
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';
        
        const drinkingAdults = parseInt(document.getElementById('drinking-adults').value) || 0;
        const selectedChopps = Array.from(choppCheckboxes).filter(cb => cb.checked).map(cb => cb.id.replace('chopp-', ''));

        let choppItems = {};
        if (selectedChopps.length > 0) {
            const totalLitersNeeded = drinkingAdults * 2.5;
            
            if (selectedChopps.length === 1) {
                const choppId = selectedChopps[0];
                const liters = findBestBarrel(totalLitersNeeded, choppId);
                choppItems[choppId] = liters;
            } else if (selectedChopps.length === 2) {
                const [chopp1, chopp2] = selectedChopps;
                const isPilsenBrahmaCombo = (chopp1 === 'pilsen' && chopp2 === 'brahma') || (chopp1 === 'brahma' && chopp2 === 'pilsen');
                const isPilsenOrBrahma = ['pilsen', 'brahma'].some(c => selectedChopps.includes(c));
                const isIpaOrVinho = ['ipa', 'vinho'].some(c => selectedChopps.includes(c));

                if (isPilsenBrahmaCombo) {
                    const halfLiters = findBestBarrel(totalLitersNeeded / 2, 'pilsen');
                    choppItems.pilsen = halfLiters;
                    choppItems.brahma = halfLiters;
                } else if (isPilsenOrBrahma && isIpaOrVinho) {
                    const largeChopp = selectedChopps.find(c => ['pilsen', 'brahma'].includes(c));
                    const specialChopp = selectedChopps.find(c => ['ipa', 'vinho'].includes(c));
                    if (largeChopp && specialChopp) {
                        choppItems[largeChopp] = 60;
                        choppItems[specialChopp] = 10;
                    }
                }
            } else if (selectedChopps.length === 3 && selectedChopps.includes('pilsen') && selectedChopps.includes('brahma') && (selectedChopps.includes('ipa') || selectedChopps.includes('vinho'))) {
                const specialChopp = selectedChopps.find(c => ['ipa', 'vinho'].includes(c));
                choppItems.pilsen = 30;
                choppItems.brahma = 30;
                if (specialChopp) {
                    choppItems[specialChopp] = 10;
                }
            } else {
                const litersPerChopp = findBestBarrel(totalLitersNeeded / selectedChopps.length, selectedChopps[0]);
                selectedChopps.forEach(chopp => {
                    choppItems[chopp] = litersPerChopp;
                });
            }
        }

        let choppTotalCost = 0;
        for (const choppId in choppItems) {
            const liters = choppItems[choppId];
            const cost = liters * pricesPerLiter[choppId];
            choppTotalCost += cost;
            const choppName = choppList.find(c => c.id === choppId)?.name || 'Chopp Desconhecido';
            resultsList.innerHTML += `<p><strong>${choppName} (${liters} Litros):</strong> R$ ${cost.toFixed(2).replace('.', ',')}</p>`;
            budgetSummary += `\n${choppName} (${liters} Litros): R$ ${cost.toFixed(2).replace('.', ',')}`;
        }
        totalBudget += choppTotalCost;

        otherCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const itemId = checkbox.id.replace('check-', '');
                const quantity = parseInt(document.getElementById(`need-${itemId}`).value) || 0;
                if (quantity > 0) {
                    const itemCost = equipmentPrices[itemId] * quantity;
                    totalBudget += itemCost;
                    const itemData = [...suppliesList, ...rentalList].find(item => item.id === itemId);
                    const itemName = itemData?.name || checkbox.nextElementSibling.textContent.trim().replace('?', '');
                    resultsList.innerHTML += `<p><strong>${itemName} (${quantity} unidade${quantity > 1 ? 's' : ''}):</strong> R$ ${itemCost.toFixed(2).replace('.', ',')}</p>`;
                    budgetSummary += `\n${itemName} (${quantity} unidade${quantity > 1 ? 's' : ''}): R$ ${itemCost.toFixed(2).replace('.', ',')}`;
                }
            }
        });

        if (totalBudget > 0) {
            const totalInstallments = totalBudget / 3;
            document.getElementById('total-price-display').textContent = `Total: R$ ${totalBudget.toFixed(2).replace('.', ',')}`;
            document.getElementById('total-installments-display').textContent = `ou 3x de R$ ${totalInstallments.toFixed(2).replace('.', ',')}`;

            budgetSummary += `\n\nTotal: R$ ${totalBudget.toFixed(2).replace('.', ',')}`;
            budgetSummary += `\nou 3x de R$ ${totalInstallments.toFixed(2).replace('.', ',')}`;
            formalizeBtn.style.display = 'block';
            lastCalculatedBudget = budgetSummary;
        } else {
            resultsList.innerHTML = `<p class="text-gray-600">Nenhum item selecionado. Por favor, escolha os produtos para calcular o orçamento.</p>`;
            document.getElementById('total-price-display').textContent = '';
            document.getElementById('total-installments-display').textContent = '';
            formalizeBtn.style.display = 'none';
            lastCalculatedBudget = '';
        }
    });
    
    formalizeBtn.addEventListener('click', () => {
        const message = `Olá! Gostaria de formalizar um pedido com base no orçamento que fiz no site. Seguem os detalhes:\n${lastCalculatedBudget}`;
        const phoneNumber = '5518981730244';
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });

    document.getElementById('whatsapp-link').addEventListener('click', function(event) {
        event.preventDefault();
        const phoneNumber = '5518981730244';
        const message = 'Olá, Chopp do Claudinho! Gostaria de fazer um orçamento. Vi o site de vocês!';
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });
    
    // Chamada inicial para definir os estilos corretos ao carregar a página
    updateChoppButtonStyles();
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        
        // Acesso ao documento principal de dados
        const dataDocRef = doc(db, `artifacts/${appId}/public/data/site-data`);
        
        // Inicia a escuta em tempo real para o documento principal
        onSnapshot(dataDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                loadContent(docSnapshot.data());
                dataLoaded = true;
            } else {
                console.log("No such document! Initializing data.");
                // Se o documento não existe, cria um com dados iniciais
                const initialData = {
                    texts: {
                        "header-title": "Chopp do Claudinho",
                        "header-subtitle": "Sua distribuidora de chopp e suprimentos para festas!",
                        "chopp-section-title": "Chopps Especiais",
                        "supplies-section-title": "Outros Produtos",
                        "rental-section-title": "Locação",
                        "calculator-section-title": "Calcule sua festa",
                        "footer-text": "* Consulte a taxa de entrega para a sua região.",
                        "footer-contact-title": "Entre em Contato",
                        "footer-phone": "Telefone: (18) 98173-0244",
                        "footer-email": "E-mail: claudioappfreitas@gmail.com",
                        "footer-address": "Endereço: Av. Joaquim Constantino, 1882 - Vila Nova Prudente"
                    },
                    products: {
                        chopps: [
                            { id: 'pilsen', name: 'Chopp Pilsen', pricePerLiter: 10.00, barrelSizes: [30, 50], hidden: false },
                            { id: 'brahma', name: 'Chopp Brahma', pricePerLiter: 18.00, barrelSizes: [30, 50], hidden: false },
                            { id: 'ipa', name: 'Chopp IPA', pricePerLiter: 15.00, barrelSizes: [10, 20, 30, 50], hidden: false },
                            { id: 'vinho', name: 'Chopp Vinho', pricePerLiter: 15.00, barrelSizes: [10, 20, 30, 50], hidden: false }
                        ],
                        supplies: [
                            { id: 'charcoal', name: 'Carvão', price: 50.00, unit: '/ 10kg', hidden: false, includable: true, question: 'Precisa de carvão?' },
                            { id: 'cubed-ice', name: 'Gelo em Cubo', price: 12.00, unit: '/ 5kg', hidden: false, includable: true, question: 'Terá outras bebidas?' },
                            { id: 'crushed-ice', name: 'Gelo Triturado', price: 25.00, unit: '/ 25kg', hidden: false, includable: false, question: '' }
                        ],
                        rentals: [
                            { id: 'thermal-box', name: 'Caixa Térmica', price: 150.00, unit: '/ diária', hidden: false, includable: true, question: 'Precisa de caixa térmica?' },
                            { id: 'tables', name: 'Jogo de Mesa', price: 15.00, unit: '/ diária', hidden: false, includable: true, question: 'Precisa de jogo de mesa?' },
                            { id: 'grill', name: 'Churrasqueira', price: 150.00, unit: '/ diária', hidden: false, includable: true, question: 'Precisa de churrasqueira?' }
                        ]
                    },
                    lastUpdated: serverTimestamp()
                };
                
                setDoc(dataDocRef, initialData).then(() => {
                    console.log("Initial data successfully written!");
                }).catch((error) => {
                    console.error("Error writing initial document: ", error);
                });
            }
        });

    } catch (error) {
        console.error("Firebase Auth error or Firestore connection error:", error);
    }
});
