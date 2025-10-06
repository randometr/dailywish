// ===== ОСНОВНОЙ СКРИПТ ПРИЛОЖЕНИЯ =====

// Ждем полной загрузки DOM перед выполнением скрипта
document.addEventListener('DOMContentLoaded', () => {
    // ===== ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ ИНТЕРФЕЙСА =====
    const connectWalletBtn = document.getElementById('connect-wallet');
    const networkAlert = document.getElementById('network-alert');
    const getWishSection = document.getElementById('get-wish-section');
    const getWishBtn = document.getElementById('get-wish');
    const wishResult = document.getElementById('wish-result');
    const wishText = document.querySelector('.wish-text');
    const wishAuthor = document.querySelector('.wish-author');
    const addWishSection = document.getElementById('add-wish-section');
    const addWishBtn = document.getElementById('add-wish-btn');
    const wishForm = document.getElementById('wish-form');
    const twitterHandleInput = document.getElementById('twitter-handle');
    const wishTextInput = document.getElementById('wish-text');
    const charCount = document.getElementById('char-count');
	const timerSection = document.getElementById('timer-section');
	const timerElement = document.getElementById('timer');
	let timerInterval = null;

    
    // ===== НАСТРОЙКИ ПРИЛОЖЕНИЯ =====
    // Адрес и ABI контракта (заполнить после деплоя)
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
]; // Заменить на ABI контракта
    
    // ID сети Base (8453 - mainnet, 84532 - testnet)
    const baseChainId = "0x2105"; // Hex для Base mainnet
    
    // Состояние приложения
    let walletConnected = false;
    let networkCorrect = false;
    let lastActionTime = 0;
    let userAddress = "";
    let contract;
    let provider;
    let signer;
    
    // Пример начальных пожеланий (временные данные)
    const initialWishes = [
        { text: "Пусть ваш день будет наполнен радостью и вдохновением!", author: "Основатель" },
        { text: "Удачи во всех начинаниях сегодня!", author: "Основатель" },
        { text: "Верьте в себя, и у вас всё получится!", author: "Основатель" },
        { text: "Сегодня вас ждут приятные сюрпризы!", author: "Основатель" },
        { text: "Творческих успехов и новых идей!", author: "Основатель" }
    ];
    
    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
    
    // Обработчик изменения текста пожелания
    wishTextInput.addEventListener('input', () => {
        const text = wishTextInput.value;
        charCount.textContent = text.length;
        
        // Изменение цвета при приближении к лимиту
        if (text.length > 250) {
            charCount.style.color = "var(--accent)";
        } else {
            charCount.style.color = "inherit";
        }
    });
    
    // Подключение кошелька
    connectWalletBtn.addEventListener('click', connectWallet);
    
    // Получение пожелания
    //getWishBtn.addEventListener('click', getRandomWish);
	getWishBtn.addEventListener('click', async () => {
    try {
		getRandomWish();
        getWishBtn.disabled = true;
        addWishBtn.disabled = true;
               
        // После получения пожелания:
        lastActionTime = Math.floor(Date.now() / 1000);
        startTimer(24 * 60 * 60);
        
    } catch (error) {
        // ... обработка ошибок ...
    }
});
		
    // Открытие формы добавления
	addWishBtn.addEventListener('click', async () => {
    try {
		wishForm.classList.remove('hidden');
        getWishBtn.disabled = true;
        addWishBtn.disabled = true;
              
        // После успешного добавления:
        lastActionTime = Math.floor(Date.now() / 1000);
        startTimer(24 * 60 * 60);
        
    } catch (error) {
        // ... обработка ошибок ...
    }
});
    
    // Отправка формы
    wishForm.addEventListener('submit', addNewWish);
    
    // ===== ОСНОВНЫЕ ФУНКЦИИ =====

	// Глобальная функция для получения провайдера
	function getWeb3Provider() {
	    // 1. Проверка на наличие OKX Wallet
	    if (window.okxwallet) {
	        return window.okxwallet;
	    }
	    // 2. Проверка на наличие MetaMask (или других, которые используют window.ethereum)
	    if (window.ethereum) {
	        return window.ethereum;
	    }
	    // 3. Проверка на наличие других провайдеров (например, Trust Wallet)
	    if (window.web3 && window.web3.currentProvider) {
	        return window.web3.currentProvider;
	    }
	    
	    return null; // Провайдер не найден
	}
	
    // Функция подключения кошелька
    async function connectWallet() {
		const web3Provider = getWeb3Provider();
        try {
            // Проверяем наличие провайдера
			if (!web3Provider) {
        		alert("Установите Web3-кошелек (MetaMask, OKX и т.д.)!");
        		return;
   			 }
            provider = new ethers.providers.BrowserProvider(web3Provider);
            // Запрашиваем доступ к аккаунтам
			const accounts = await provider.send('eth_requestAccounts', []);
       		userAddress = accounts[0];
        	walletConnected = true;
            
            // Обновляем UI
            connectWalletBtn.textContent = `Кошелёк: ${shortenAddress(userAddress)}`;
            connectWalletBtn.disabled = true;
            
            // Инициализируем провайдер и подписывающего
            //provider = new ethers.providers.Web3Provider(window.ethereum);
			//provider = new ethers.BrowserProvider(web3Provider);
            signer = provider.getSigner();
            
            // Проверяем сеть
            await checkNetwork();
            
            // Инициализируем контракт
			contract = new ethers.Contract(contractAddress, contractABI, signer);
			
			// Получаем время последнего действия и обновляем состояние кнопок
			lastActionTime = await contract.lastActionTime(userAddress);
    		updateButtonStates();
            
        } catch (error) {
            console.error("Ошибка подключения кошелька:", error);
            alert(`Ошибка подключения: ${error.message}`);
        }
    }

	// Функция обновления состояния кнопок
	function updateButtonStates() {
   		const currentTime = Math.floor(Date.now() / 1000);
    	const timeSinceLastAction = currentTime - lastActionTime;
    	const cooldownPeriod = 24 * 60 * 60; // 24 часа в секундах
    
    	if (timeSinceLastAction < cooldownPeriod) {
        // Действие недоступно
        	getWishBtn.disabled = true;
        	addWishBtn.disabled = true;
        	startTimer(cooldownPeriod - timeSinceLastAction);
    	} else {
        // Действие доступно
        	getWishBtn.disabled = false;
        	addWishBtn.disabled = false;
        	timerSection.classList.add('hidden');
    	}
	}

	// Функция запуска таймера
	function startTimer(seconds) {
    	timerSection.classList.remove('hidden');
    	clearInterval(timerInterval);
    	let remaining = seconds;
    	timerInterval = setInterval(() => {
        	remaining--;
		if (remaining <= 0) {
			clearInterval(timerInterval);
            updateButtonStates();
            return;
        }
        
        // Форматирование времени
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;
        
        timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        timerElement.classList.add('pulse');
		}, 1000);
	}
	
    // Функция проверки сети
    async function checkNetwork() {
		const chainId = await provider.send('eth_chainId', []);
		networkCorrect = chainId === baseChainId;
       // const network = await provider.getNetwork();
       // networkCorrect = network.chainId === parseInt(baseChainId, 16);
        
        if (networkCorrect) {
            networkAlert.classList.add('hidden');
        } else {
            networkAlert.classList.remove('hidden');
			getWishBtn.disabled = true;
			addWishBtn.disabled = true;
        }
    }
    
    // Функция получения случайного пожелания
    async function getRandomWish() {
        try {            
			
            // Показываем индикатор загрузки
            getWishBtn.textContent = "Загрузка...";
            getWishBtn.disabled = true;
			addWishBtn.disabled = true;
            
            // Вызываем функцию контракта
            const wishTextFromContract = await contract.getRandomWish();
            
            // Для демо: если контракт не подключен, используем тестовые данные
            const wish = contractAddress 
                ? { text: wishTextFromContract, author: "Аноним" } 
                : initialWishes[Math.floor(Math.random() * initialWishes.length)];
            
            // Обновляем UI
            wishText.textContent = `${wish.text}`;
            wishAuthor.textContent = wish.author ? `- ${wish.author}` : "";
            wishResult.classList.remove('hidden');
            addWishSection.classList.remove('hidden');
            
            // Обновляем время последнего действия
            //lastActionTime = Date.now();
			lastActionTime = Math.floor(Date.now() / 1000);
			startTimer(24 * 60 * 60);
            
            // Восстанавливаем кнопку
            getWishBtn.textContent = "Получить пожелание (только gas)";
            
        } catch (error) {
            console.error("Ошибка получения пожелания:", error);
            alert(`Ошибка: ${error.message}`);
            getWishBtn.textContent = "Получить пожелание (только gas)";
            getWishBtn.disabled = false;
        }
    }
    
    // Функция добавления нового пожелания
    async function addNewWish(e) {
        e.preventDefault();
        
        try {
            const twitterHandle = twitterHandleInput.value.trim();
            const text = wishTextInput.value.trim();
            
            // Валидация ввода
            if (text.length === 0) {
                alert("Пожалуйста, введите текст пожелания");
                return;
            }
            
            if (text.length > 280) {
                alert("Пожелание слишком длинное (максимум 280 символов)");
                return;
            }
                        
            // Показываем индикатор загрузки
            const submitBtn = wishForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Отправка...";
            submitBtn.disabled = true;
            
            // Вызываем функцию контракта
            if (contractAddress) {
                const tx = await contract.addWish(
                    twitterHandle || "Base Anonym", 
                    text
                );
                
                // Ждем подтверждения транзакции
                await tx.wait();
            }
            
            // Показываем сообщение об успехе
            alert(`Пожелание добавлено! Текст: ${text}`);
            
            // Сбрасываем форму
            wishForm.reset();
            wishForm.classList.add('hidden');
            charCount.textContent = "0";

			// Обновляем время последнего действия
            lastActionTime = Math.floor(Date.now() / 1000);
			startTimer(24 * 60 * 60); 
            
            // Восстанавливаем кнопку
            submitBtn.textContent = "Отправить";
            submitBtn.disabled = false;
            
        } catch (error) {
            console.error("Ошибка добавления пожелания:", error);
            alert(`Ошибка: ${error.message}`);
            
            const submitBtn = wishForm.querySelector('button[type="submit"]');
            submitBtn.textContent = "Отправить";
            submitBtn.disabled = true;
        }
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
	
    // Сокращение адреса кошелька для отображения
    function shortenAddress(address) {
        if (!address) return "";
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
    
    // Обработчик изменения сети
    if (window.ethereum) {
        window.ethereum.on('chainChanged', (chainId) => {
            window.location.reload(); // Перезагружаем страницу при смене сети
        });
        
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length > 0) {
                userAddress = accounts[0];
                connectWalletBtn.textContent = `Кошелёк: ${shortenAddress(userAddress)}`;
            } else {
                // Пользователь отключил кошелек
                walletConnected = false;
                connectWalletBtn.textContent = "Подключить кошелёк";
                connectWalletBtn.disabled = false;
                getWishSection.classList.add('hidden');
                wishResult.classList.add('hidden');
                addWishSection.classList.add('hidden');
            }
        });
    }
});














