
var bip39 = require('bip39');
var bitcoinjs = require('bitcoinjs-lib');
const ElectrumCli = require('electrum-client');


var viacoinNetwork = {
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  dustThreshold: 560,
  feePerKb: 100000,
  messagePrefix: '\x18Viacoin Signed Message:\n',
  pubKeyHash: 0x47,
  scriptHash: 0x21,
  wif: 0xc7
};


// btc testnet addr: mqCTwbzcMY7UmNPPBjsFmb61d8S5aE42vG
// faucet req tx id: ce38f47624b6ff870fe164112deabd91dff4be0ac9d7e3e7bc57db80c6b83ef1


var networkToUse = bitcoinjs.networks.testnet;
var coinPath = '1';


var mnemonic = bip39.generateMnemonic()
mnemonic = "tiger december slogan hamster knock ladder fossil already tunnel that photo possible";
console.log(`Mnemonic genereated:  ${mnemonic}`);


var seed = bip39.mnemonicToSeed(mnemonic);
var root = bitcoinjs.HDNode.fromSeedBuffer(seed, networkToUse);


function getAddrForAcc(accNo) {
	var path = `m/44'/${coinPath}'/0'/0/${accNo}`;
	return root.derivePath(path);	
}


var child = getAddrForAcc(0);
var address = child.getAddress();
var privateKey = child.keyPair;
var changeAddr = getAddrForAcc(1).getAddress();


console.log(`Generated address: ${address}`);
console.log(`Generated ch address: ${changeAddr}`);
console.log(`Private key: ${privateKey.toWIF()}`);


//---------------------------------------------------------


var electrumIP = '18.221.223.44';
var electrumPort = 50001;


async function checkBalanace(address) {
	var ecl = new ElectrumCli(electrumPort, electrumIP, 'tcp');
	await ecl.connect();
	try{
	    var bal = await ecl.blockchainAddress_getBalance(address);
	    console.log(`Balance [${address}]: ${bal.confirmed.toString()}`);
	}catch(e){
	    console.log(e);
	}
	await ecl.close();
}


async function checkAllBalances() {
	await checkBalanace(address);
	await checkBalanace(changeAddr);
}


checkAllBalances();


//---------------------------------------------------------


var faucetAddr = "2MtMt6Qq6eJFqFu12bDaGhEC6ZcMsxs4aiv";


async function sendAmt(address, privateKey) {
	var ecl = new ElectrumCli(electrumPort, electrumIP, 'tcp');
	await ecl.connect();
	try{
	    var unspTx = (await ecl.blockchainAddress_listunspent(address))[0];

	    var unspTxAmt = unspTx.value;
	    var unspTxHash = unspTx.tx_hash;
	    var fee = 10000;
	    var amtToSend = 2;

	    var tx = new bitcoinjs.TransactionBuilder(networkToUse);
		tx.addInput(unspTxHash, 0);
		tx.addOutput(faucetAddr, amtToSend);						// send 2 satoshis to tgt
		tx.addOutput(changeAddr, unspTxAmt - fee - amtToSend);		// send rest to changeAddr (minus fee ofcourse) 
		tx.sign(0, privateKey);
		var txHex = tx.build().toHex();

		var sendTxId = (await ecl.blockchainTransaction_broadcast(txHex));
		console.log(`Send transaction id:  ${sendTxId}`);
	}catch(e){
	    console.log(e);
	}
	await ecl.close();
}



sendAmt(address, privateKey);




