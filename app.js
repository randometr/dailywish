// === Глобальные переменные ===
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let lastActionTime = 0;
let timerInterval = null;
let rulesAccepted = false;

// let web3Provider = null;

// === Конфигурация ===
const contractAddress = "0x67e2aD9391DdA5462bff88554c6883522eD825Bd"; // Заменить на реальный адрес
const contractABI = [
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_author",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "_text",
				"type": "string"
			}
		],
		"name": "addWish",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getRandomWish",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string[]",
				"name": "initialAuthors",
				"type": "string[]"
			},
			{
				"internalType": "string[]",
				"name": "initialWishes",
				"type": "string[]"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "wishId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "author",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "text",
				"type": "string"
			}
		],
		"name": "WishAdded",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "wishId",
				"type": "uint256"
			}
		],
		"name": "getWish",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getWishesCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "lastActionTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "wishes",
		"outputs": [
			{
				"internalType": "string",
				"name": "author",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "text",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];
const baseChainId = "0x2105"; // Base Mainnet

// === Функция получения провайдера ===
function getWeb3Provider() {
    if (window.okxwallet) return window.okxwallet;
    if (window.ethereum) return window.ethereum;
    return null;
}

// === Инициализация приложения ===
async function initApp() {
	const hasAccepted = localStorage.getItem('rulesAccepted');
    if (hasAccepted === 'true') {
        rulesAccepted = true;
    }
    const web3Provider = getWeb3Provider();
    // if (!web3Provider) {
    //     alert("Установите Web3-кошелек (MetaMask, OKX и т.д.)!");
    //     return;
    // }

    try {
        // Проверяем, есть ли уже подключенные аккаунты
        const accounts = await web3Provider.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await finalizeConnection(accounts[0]);
        }
    } catch (error) {
        console.warn("Автоматическое подключение не удалось:", error);
    }
}

// === Подключение кошелька ===
async function connectWallet() {
    const web3Provider = getWeb3Provider();
    // if (!web3Provider) {
    //     alert("Установите Web3-кошелек!");
    //     return;
    // }

    try {
        const accounts = await web3Provider.request({ method: 'eth_requestAccounts' });
        await finalizeConnection(accounts[0]);
    } catch (error) {
        console.error("Ошибка подключения:", error);
        alert(`Ошибка: ${error.message}`);
    }
}

// === Финальная инициализация после подключения ===
async function finalizeConnection(address) {
    userAddress = address;
    // document.getElementById('connect-wallet').textContent = `Кошелёк: ${shortenAddress(address)}`;
    // document.getElementById('connect-wallet').disabled = true;
	document.getElementById('connect-wallet').textContent = `Кошелёк: ${shortenAddress(address)} (Отключиться)`;
	document.getElementById('connect-wallet').disabled = false;

    const web3Provider = getWeb3Provider();
    provider = new ethers.BrowserProvider(web3Provider);
    signer = await provider.getSigner();
    contract = new ethers.Contract(contractAddress, contractABI, signer);

    await checkNetwork();
    await updateBalance();
    await updateButtonStates();
    document.getElementById('actions-section').classList.remove('hidden');
	if (!rulesAccepted) {
		showRulesModal();
	}
}

// === Проверка сети ===
async function checkNetwork() {
    try {
        const chainId = await provider.send('eth_chainId', []);
        const networkCorrect = chainId === baseChainId;

        if (!networkCorrect) {
            document.getElementById('network-alert').classList.remove('hidden');
            document.getElementById('actions-section').classList.add('hidden');
           	const switched = await suggestNetworkSwitch();
			if (switched) {
                // Если переключение прошло успешно, перезапускаем инициализацию
                await finalizeConnection(userAddress); 
            }
            
        } else {
            document.getElementById('network-alert').classList.add('hidden');
            document.getElementById('actions-section').classList.remove('hidden');
        }
    } catch (error) {
        console.error("Ошибка проверки сети:", error);
        document.getElementById('network-alert').classList.remove('hidden');
    }
}

// === Предложение переключения сети ===
async function suggestNetworkSwitch() {
    try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: baseChainId }]);
		return true; 
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await provider.send('wallet_addEthereumChain', [{
                    chainId: baseChainId,
                    chainName: 'Base Mainnet',
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://mainnet.base.org'],
                    blockExplorerUrls: ['https://basescan.org']
                }]);
            } catch (addError) {
                console.error('Не удалось добавить сеть:', addError);
                return false;
			}
        } else if (switchError.code === 4001) {
            // Пользователь отклонил
            alert("Вы отклонили запрос на смену сети.");
            return false;
        }
        return false;
    }
}

// === Обновление баланса ===
async function updateBalance() {
    if (!userAddress) return;
    const balance = await provider.getBalance(userAddress);
    document.getElementById('balance').textContent = `${ethers.formatEther(balance)} ETH`;
    document.getElementById('balance-section').classList.remove('hidden');
}

// === Обновление состояния кнопок ===
async function updateButtonStates() {
	if (!contract || !userAddress) return;
		const lastAction = await contract.lastActionTime(userAddress);
        lastActionTime = Number(lastAction); // timestamp из смарт-контракта
        const currentTime = Math.floor(Date.now() / 1000);
        const timeSinceLastAction = currentTime - lastActionTime;
        const cooldownPeriod = 24 * 60 * 60;

		const getBtn = document.getElementById('get-wish');
    	const addBtn = document.getElementById('add-wish');

	    if (timeSinceLastAction < cooldownPeriod) {
			getBtn.disabled = true;
	        addBtn.disabled = true;
	        startTimer(cooldownPeriod - timeSinceLastAction);
	    } else {
	        getBtn.disabled = false;
	        addBtn.disabled = false;
	        document.getElementById('timer-section').classList.add('hidden');
	    } 
 // catch (err) {
//		alert('Ошибка получения lastActionTime:', err);
//	} -->
		}

// === Сброс состояния приложения ===
function resetAppState() {
    // Сброс глобальных переменных
    provider = null;
    signer = null;
    contract = null;
    userAddress = null;
    lastActionTime = 0;
    clearInterval(timerInterval);

    // Сброс UI
    document.getElementById('connect-wallet').textContent = "Подключить кошелёк";
    document.getElementById('connect-wallet').disabled = false;
    document.getElementById('actions-section').classList.add('hidden');
    document.getElementById('balance-section').classList.add('hidden');
    document.getElementById('timer-section').classList.add('hidden');
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('network-alert').classList.add('hidden');
}

// === Запуск таймера ===
function startTimer(seconds) {
    document.getElementById('timer-section').classList.remove('hidden');
    clearInterval(timerInterval);

    let remaining = seconds;
    timerInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(timerInterval);
            updateButtonStates();
            return;
        }

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;
        document.getElementById('timer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

// === Получение пожелания ===
async function getRandomWish() {
	 if (!rulesAccepted) {
        alert("Пожалуйста, ознакомьтесь с правилами и подтвердите согласие");
        showRulesModal();
        return;
    }
    try {
        document.getElementById('get-wish').disabled = true;
        document.getElementById('add-wish').disabled = true;
	
        const wishTextFromContract = await contract.getRandomWish.staticCall(); //Вызов без изменения контракта!
		const countBigInt = await contract.getWishesCount();
        const count = Number(countBigInt);
		let author = "DailyWisher";

		for (let i = 0; i < count; i++) {
            const [a, t, ts] = await contract.getWish(i);
            if (t === wishTextFromContract) {
                author = a;
                break;
            }
        }

        document.querySelector('.wish-text').textContent = wishTextFromContract;
        document.querySelector('.wish-author').textContent = `© ${author}`;
        document.getElementById('result-section').classList.remove('hidden');

        lastActionTime = Math.floor(Date.now() / 1000);
        startTimer(24 * 60 * 60);
		//localStorage.setItem("lastActionTime", lastActionTime);
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    } finally {
        document.getElementById('get-wish').disabled = false;
		document.getElementById('add-wish').disabled = false;
    }
}

// === Добавление пожелания ===
// async function addWish() {
//     try {
//         document.getElementById('add-wish').disabled = true;
//         const tx = await contract.addWish("Аноним", "Тестовое пожелание");
//         await tx.wait();
//         alert("Пожелание добавлено!");
//         lastActionTime = Math.floor(Date.now() / 1000);
//         startTimer(24 * 60 * 60);
// 		localStorage.setItem("lastActionTime", lastActionTime);
//     } catch (error) {
//         alert(`Ошибка: ${error.message}`);
//     } finally {
//         document.getElementById('add-wish').disabled = false;
//     }
// }
function openAddWishModal() {
	if (!rulesAccepted) {
	alert("Пожалуйста, ознакомьтесь с правилами и подтвердите согласие");
	showRulesModal();
	return;
}
	estimateAddWishGas();
    const modal = document.getElementById('modal-add-wish');
    modal.classList.remove('hidden');
	console.log("Функция openAddWishModal вызвана");
	console.log("Модальное окно:", modal);
    
    // Очищаем форму
    document.getElementById('wish-author').value = '';
    document.getElementById('wish-text').value = '';
}

async function handleAddWishSubmit(event) {
    event.preventDefault();
    
    const author = document.getElementById('wish-author').value;
    const text = document.getElementById('wish-text').value;
	
    // Валидация
    if (!text.trim()) {
        alert("Текст пожелания не может быть пустым!");
        return;
    }

	// if (containsBadWords(text)) {
	// alert("Текст содержит недопустимые слова. Пожалуйста, измените его.");
	// return;
 //    }
    
    if (text.length > 280) {
        alert("Текст слишком длинный! Максимум 280 символов.");
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Отправка...";
        
        // Вызываем контракт
        const tx = await contract.addWish(author || "Аноним", text);
        const receipt = await tx.wait();
        
        // Обновляем состояние
        const block = await provider.getBlock(receipt.blockNumber);
        lastActionTime = block.timestamp;
        startTimer(24 * 60 * 60);
        
        // Закрываем модальное окно
        closeModal('modal-add-wish');
        alert("Пожелание успешно добавлено!");
        
    } catch (error) {
        console.error("Ошибка добавления:", error);
        alert(`Ошибка: ${error.message}`);
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Отправить";
        }
    }
}

// === Просмотр всех пожеланий в контракте ===
async function viewAllWishes() {
	const modal = document.getElementById('modal-all');
	const list = document.getElementById('all-wishes-list');
	console.log("Функция viewAllWishes вызвана");
	console.log("Модальное окно:", modal);
	list.innerHTML = "<li>Загрузка...</li>";
	modal.classList.remove('hidden');

	try {
		// 1. Получаем общее количество пожеланий
		const countBigInt = await contract.getWishesCount();
		const count = Number(countBigInt);
		//console.log("Общее количество пожеланий:", count);
		
		if (count === 0) {
			list.innerHTML = "<li>В контракте нет ни одного пожелания.</li>";
			return;
		}
		
		list.innerHTML = ""; // Очищаем "Загрузка..."
		const promises = [];

		// 2. В цикле получаем каждое пожелание по ID
		for (let i = 0; i < count; i++) {
			//console.log("Попытка получить пожелание с ID:", i);
			// Предполагаем, что getWish возвращает (author, text, timestamp)
			//try {
			promises.push(contract.getWish(i));
			
			//const [author, text, timestamp] = await contract.getWish(i);
		
			//const li = document.createElement('li');
			//li.textContent = `[ID: ${i}] ${text} — ${author}`;
			//list.appendChild(li);
			//} catch (error) {
			//	console.error("Ошибка при ID:", i, error);
			}
		const allWishesData = await Promise.all(promises);
		allWishesData.forEach((wishData, i) => {
            // wishData - это массив [author, text, timestamp]
            // const [author, text, timestamp] = wishData;
			const author = wishData[0];
            const text = wishData[1];
			const li = document.createElement('li');
			// Проверяем, что текст пожелания не пустой
            if (text && text.length > 0) {
				li.textContent = `[ID: ${i}] ${text} — ${author}`;
                list.appendChild(li);
            } else {
                // Если пожелание пустое, можно добавить заглушку
                li.textContent = `[ID: ${i}] (Пустое пожелание)`;
                list.appendChild(li);
            }
        });
	  
	} catch (error) {
		console.error("Ошибка загрузки всех пожеланий:", error);
		list.innerHTML = "<li>Ошибка загрузки данных из контракта. Проверьте консоль.</li>";
	}
}

// === Закрытие модального окна ===
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// === Закрытие модального окна ===
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// === Сокращение адреса ===
function shortenAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// === Функция показа правил ===
function showRulesModal() {
    // Проверяем, не принимал ли пользователь правила ранее
    const hasAccepted = localStorage.getItem('rulesAccepted');
	console.log("Функция showRulesModal вызвана");
	console.log("hasAccepted:", hasAccepted);

	const modal = document.getElementById('modal-rules');
	modal.classList.remove('hidden');

	const acceptButton = document.getElementById('accept-rules');
    acceptButton.classList.remove('hidden');

	if (rulesAccepted) {
        acceptButton.textContent = "Закрыть";
    } else {
        acceptButton.textContent = "Я согласен";
    }
}

// === Функция скрытия правил и сохранения согласия ===
function acceptRules() {
    const modal = document.getElementById('modal-rules');
    modal.classList.add('hidden');
    
    // Сохраняем согласие в localStorage
	if (!rulesAccepted) {
	    localStorage.setItem('rulesAccepted', 'true');
	    rulesAccepted = true;
	}
}

// === Функция оценки комиссии ===
async function estimateAddWishGas() {
    try {
        const gasEstimate = await contract.addWish.estimateGas("Аноним", "Пример текста");
        const gasPrice = await provider.getFeeData();
        const gasCost = gasEstimate * gasPrice.gasPrice;
        
        document.getElementById('gas-estimate').textContent = ethers.formatEther(gasCost);
    } catch (error) {
        console.error("Ошибка оценки комиссии:", error);
        document.getElementById('gas-estimate').textContent = "неизвестно";
    }
}

// === Функция для создания ссылки на X (Twitter) ===
function shareOnX() {
    // 1. Получаем текущее пожелание и автора
    const wishText = document.querySelector('.wish-text').textContent;
    const wishAuthor = document.querySelector('.wish-author').textContent;
    
    // 2. Формируем текст поста
    const postText = `Моё пожелание на сегодня: "${wishText}" by ${wishAuthor}`;
    
    // 3. Определяем хэштеги и ссылку на ваш сайт
    const hashtags = "DailyWish,Web3,Base,EVM,Crypto"; // Ваши хэштеги
    const url = "https://randometr.github.io/dailywish/"; // Замените на адрес вашего GitHub Pages сайта!
    
    // 4. Кодируем текст для URL
    const encodedText = encodeURIComponent(postText);
    const encodedHashtags = encodeURIComponent(hashtags);
    const encodedUrl = encodeURIComponent(url);
    
    // 5. Формируем полную ссылку для X (Twitter)
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&hashtags=${encodedHashtags}&url=${encodedUrl}`;
    
    // 6. Открываем новое окно
    window.open(twitterUrl, '_blank');
}

// === Функция проверки на плохие слова ===
// function containsBadWords(text) {
//     const badWords = [
//         'мат1', 'мат2', 'мат3', 'оскорбление1', 'оскорбление2', 
//         'плохоеслово1', 'плохоеслово2', 'ненормативнаялексика'
//     ];
    
//     const lowerText = text.toLowerCase();
//     return badWords.some(word => lowerText.includes(word));
// }

// === Инициализация при загрузке ===
document.addEventListener('DOMContentLoaded', () => {
    // document.getElementById('connect-wallet').addEventListener('click', connectWallet);
	const showRulesBtn = document.getElementById('show-rules');
	if (showRulesBtn) {
        showRulesBtn.addEventListener('click', showRulesModal);
    }
	document.getElementById('accept-rules').addEventListener('click', () => {
	if (rulesAccepted) {
		// Если правила уже приняты - просто закрываем окно
		closeModal('modal-rules');
	} else {
		// Если еще не приняты - сохраняем согласие
		acceptRules();
	}
});
	const web3Provider = getWeb3Provider();
	document.getElementById('connect-wallet').addEventListener('click', () => {
    if (userAddress) {
        // Если уже подключен, вызываем сброс
        resetAppState();
        alert("Состояние сброшено. Для полного отключения от сайта, пожалуйста, сделайте это в настройках вашего кошелька.");
    } else {
        // Если не подключен, запрашиваем подключение
        connectWallet();
    }
});
	if (web3Provider) {
		web3Provider.on('chainChanged', (chainId) => {
			 if (userAddress) {
				 finalizeConnection(userAddress);
        }
			if (document.getElementById('modal-add-wish').classList.contains('hidden')) {
        		estimateAddWishGas();
    }
    });
		web3Provider.on('accountsChanged', (accounts) => {
			if (accounts.length > 0) {
				finalizeConnection(accounts[0]);
        } else {
            resetAppState();
        }
    });
}
    document.getElementById('get-wish').addEventListener('click', getRandomWish);
	document.getElementById('add-wish').addEventListener('click', openAddWishModal);
	document.getElementById('add-wish-form').addEventListener('submit', handleAddWishSubmit);
	document.getElementById('share-wish').addEventListener('click', shareOnX);
    document.getElementById('view-all').addEventListener('click', viewAllWishes);
	document.getElementById('wish-text').addEventListener('input', function() {
        const count = this.value.length;
        document.getElementById('char-count').textContent = `${count}/280 символов`;
        document.getElementById('char-count').style.color = count > 280 ? 'red' : 'inherit';
    });
    // document.getElementById('add-wish').addEventListener('click', addWish);
	//document.getElementById('view-received').addEventListener('click', viewReceivedWishes);
    //document.getElementById('view-added').addEventListener('click', viewAddedWishes);
	window.addEventListener('click', function(event) {
		const modals = document.querySelectorAll('.modal');
		modals.forEach(modal => {
			if (event.target === modal) {
				modal.classList.add('hidden');
			}
		});
	});

    initApp();
});




















