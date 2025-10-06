// === Глобальные переменные ===
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;
let lastActionTime = 0;
let timerInterval = null;

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
    const web3Provider = getWeb3Provider();
    if (!web3Provider) {
        alert("Установите Web3-кошелек (MetaMask, OKX и т.д.)!");
        return;
    }

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
    if (!web3Provider) {
        alert("Установите Web3-кошелек!");
        return;
    }

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
    document.getElementById('connect-wallet').textContent = `Кошелёк: ${shortenAddress(address)}`;
    document.getElementById('connect-wallet').disabled = true;

    const web3Provider = getWeb3Provider();
    provider = new ethers.BrowserProvider(web3Provider);
    signer = await provider.getSigner();
    contract = new ethers.Contract(contractAddress, contractABI, signer);

    await checkNetwork();
    await updateBalance();
    await updateButtonStates();
    document.getElementById('actions-section').classList.remove('hidden');
}

// === Проверка сети ===
async function checkNetwork() {
    try {
        const chainId = await provider.send('eth_chainId', []);
        const networkCorrect = chainId === baseChainId;

        if (!networkCorrect) {
            document.getElementById('network-alert').classList.remove('hidden');
            document.getElementById('actions-section').classList.add('hidden');
            await suggestNetworkSwitch();
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
                alert("Добавьте сеть Base вручную.");
            }
        }
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
	try {
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
	catch (err) {
		alert('Ошибка получения lastActionTime:', err);
    }
	}
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
    try {
        document.getElementById('get-wish').disabled = true;
        document.getElementById('add-wish').disabled = true;

        const wishTextFromContract = await contract.getRandomWish();
        const wish = { text: wishTextFromContract, author: "Аноним" };

        document.querySelector('.wish-text').textContent = wish.text;
        document.querySelector('.wish-author').textContent = wish.author ? `- ${wish.author}` : "";
        document.getElementById('result-section').classList.remove('hidden');

        lastActionTime = Math.floor(Date.now() / 1000);
        startTimer(24 * 60 * 60);
		localStorage.setItem("lastActionTime", lastActionTime);
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    } finally {
        document.getElementById('get-wish').disabled = false;
    }
}

// === Добавление пожелания ===
async function addWish() {
    try {
        document.getElementById('add-wish').disabled = true;
        const tx = await contract.addWish("Аноним", "Тестовое пожелание");
        await tx.wait();
        alert("Пожелание добавлено!");
        lastActionTime = Math.floor(Date.now() / 1000);
        startTimer(24 * 60 * 60);
		localStorage.setItem("lastActionTime", lastActionTime);
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    } finally {
        document.getElementById('add-wish').disabled = false;
    }
}

// === Просмотр полученных пожеланий ===
async function viewReceivedWishes() {
    const modal = document.getElementById('modal-received');
    const list = document.getElementById('receivedlist');
    list.innerHTML = "<li>Загрузка...</li>";
    modal.classList.remove('hidden');

    try {
        const count = await contract.getWishesCount();
        if (count === 0) {
            list.innerHTML = "<li>Нет полученных пожеланий</li>";
            return;
        }

        for (let i = 0; i < count; i++) {
            const [author, text] = await contract.getWish(i);
            const li = document.createElement('li');
            li.textContent = `${text} - ${author}`;
            list.appendChild(li);
        }
    } catch (error) {
        list.innerHTML = "<li>Ошибка загрузки</li>";
    }
}

// === Просмотр добавленных пожеланий ===
async function viewAddedWishes() {
    const modal = document.getElementById('modal-added');
    const list = document.getElementById('addedlist');
    list.innerHTML = "<li>Загрузка...</li>";
    modal.classList.remove('hidden');

    try {
        const count = await contract.getWishesCount();
        if (count === 0) {
            list.innerHTML = "<li>Вы еще не добавляли пожеланий</li>";
            return;
        }

        for (let i = 0; i < count; i++) {
            const [author, text] = await contract.getWish(i);
            const li = document.createElement('li');
            li.textContent = `${text} - ${author}`;
            list.appendChild(li);
        }
    } catch (error) {
        list.innerHTML = "<li>Ошибка загрузки</li>";
    }
}

// === Закрытие модального окна ===
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// === Сокращение адреса ===
function shortenAddress(address) {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// === Инициализация при загрузке ===
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    document.getElementById('get-wish').addEventListener('click', getRandomWish);
    document.getElementById('add-wish').addEventListener('click', addWish);
    document.getElementById('view-received').addEventListener('click', viewReceivedWishes);
    document.getElementById('view-added').addEventListener('click', viewAddedWishes);

    initApp();
});



