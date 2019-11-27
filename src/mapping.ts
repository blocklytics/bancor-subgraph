import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  AddressUpdate,
  OwnerUpdate as ContractRegistryOwnerUpdate
} from "../generated/ContractRegistryContract/ContractRegistryContract"
import {
  TokenAddition,
  TokenRemoval,
  ConverterAddition,
  ConverterRemoval,
  OwnerUpdate as ConverterRegistryOwnerUpdate
} from "../generated/templates/ConverterRegistryContract/ConverterRegistryContract"
import {
  ConverterContract
} from "../generated/ContractRegistryContract/ConverterContract"
import {
  SmartTokenContract
} from "../generated/ContractRegistryContract/SmartTokenContract"
import {
  ERC20Contract
} from "../generated/ContractRegistryContract/ERC20Contract"
import {
  Conversion,
  ConversionFeeUpdate,
  ManagerUpdate,
  PriceDataUpdate,
  OwnerUpdate as ConverterOwnerUpdate
} from "../generated/templates/ConverterContract/ConverterContract"
import {
  NewSmartToken,
  Issuance,
  Destruction,
  Transfer,
  Approval,
  OwnerUpdate as SmartTokenOwnerUpdate
} from "../generated/templates/SmartTokenContract/SmartTokenContract"
import {
  ConverterRegistryContract as ConverterRegistryTemplate, 
  SmartTokenContract as SmartTokenTemplate, 
  ConverterContract as ConverterTemplate
} from "../generated/templates"
import {
  BancorContract, 
  ConverterRegistry,
  Converter, 
  Token, 
  Connector,
  Swap, 
  QuickBuyPathMember,
  ContractRegistry
} from "../generated/schema"

// Contract Registry events
export function handleAddressUpdate(event: AddressUpdate): void {
  let contractRegistryEntity = new ContractRegistry(event.address.toHex());
  let contractName = event.params._contractName.toString();
  let contractAddress = event.params._contractAddress.toHex();
  log.debug("Contract registry address updated at block# {}: {} is now at {}", [event.block.number.toString(), contractName, contractAddress]);
  if(contractName == "BancorConverterRegistry") {
    ConverterRegistryTemplate.create(event.params._contractAddress);
    let converterRegistries = contractRegistryEntity.converterRegistries || [];
    let converterRegistryEntity = ConverterRegistry.load(contractAddress)
    if (converterRegistryEntity == null) {
      converterRegistryEntity = new ConverterRegistry(contractAddress);
    }
    converterRegistries.push(event.params._contractAddress.toHex());
    contractRegistryEntity.converterRegistries = converterRegistries;
    converterRegistryEntity.save();
    contractRegistryEntity.save();
  }
  let bancorContractEntity = new BancorContract(contractAddress);
  bancorContractEntity.name = contractName;
  bancorContractEntity.registry = event.address.toHex();
  bancorContractEntity.save();
}

export function handleContractRegistryOwnerUpdate(event: ContractRegistryOwnerUpdate): void {
  let contractRegistryEntity = new ContractRegistry(event.address.toHex());
  contractRegistryEntity.owner = event.params._newOwner.toHex();
  contractRegistryEntity.save();
}

// Converter Registry events
export function handleTokenAddition(event: TokenAddition): void {}

export function handleTokenRemoval(event: TokenRemoval): void {}

export function handleConverterAddition(event: ConverterAddition): void {
  log.debug("Converter added to registry: {}, Token: {}", [event.params._address.toHex(), event.params._token.toHex()]);
  let converterAddress = event.params._address;
  let converterEntity = Converter.load(converterAddress.toHex());

  if(converterEntity == null) {
    ConverterTemplate.create(event.params._address);
    converterEntity = new Converter(converterAddress.toHex());
  }
  let converterContract = ConverterContract.bind(converterAddress);
  let converterQBPLength = 0;
  let converterQuickBuyPath = converterEntity.quickBuyPath || [];
  let converterQBPLengthResult = converterContract.try_getQuickBuyPathLength();
  if(!converterQBPLengthResult.reverted) {
    converterQBPLength = converterQBPLengthResult.value.toI32();
    if(converterQuickBuyPath.length == 0){
      for(var i = 0; i < converterQBPLength; i++) {
        let pathMemberAddress = converterContract.quickBuyPath(BigInt.fromI32(i));
        let pathMemberID = converterAddress.toHex() + "-" + pathMemberAddress.toHex() + "-" + i.toString();
        let pathMember = new QuickBuyPathMember(pathMemberID);
        pathMember.index = i;
        pathMember.token = pathMemberAddress.toHex();
        pathMember.save();
        converterQuickBuyPath.push(pathMemberID);
      }
    }
    log.debug("Converter {}, QBP Length: {}, QBP: {}", [converterAddress.toHex(), converterQBPLength.toString(), converterQuickBuyPath.toString()])
  }
  
  let smartTokenAddress = converterContract.token();
  SmartTokenTemplate.create(smartTokenAddress);

  let smartTokenContract = SmartTokenContract.bind(smartTokenAddress);
  let smartTokenEntity = new Token(smartTokenAddress.toHex());
  smartTokenEntity.isSmartToken = true;

  let connectorTokenAddress = event.params._token;

  let connectorTokenEntity = Token.load(connectorTokenAddress.toHex());
  if (connectorTokenEntity == null) {
    connectorTokenEntity = new Token(connectorTokenAddress.toHex());
  }
  let connectorTokenContract = ERC20Contract.bind(connectorTokenAddress);
  if((converterQBPLength != null && converterQBPLength != 0) && (connectorTokenEntity.shortestQuickBuyPath == null || converterQBPLength < connectorTokenEntity.shortestQuickBuyPath.length)){
    connectorTokenEntity.shortestQuickBuyPath = converterEntity.quickBuyPath;
    connectorTokenEntity.converterWithShortestQuickBuyPath = converterAddress.toHex();
  }
  connectorTokenEntity.isSmartToken = false;
  // THIS IS THE SECTION THAT CAUSES ISSUES - name and symbol
  let connectorTokenNameResult = connectorTokenContract.try_name();
  if(!connectorTokenNameResult.reverted) {
    connectorTokenEntity.name = connectorTokenNameResult.value;
  }
  let connectorTokenSymbolResult = connectorTokenContract.try_symbol();
  if(!connectorTokenSymbolResult.reverted) {
    connectorTokenEntity.symbol = connectorTokenSymbolResult.value;
  }
  let connectorTokenDecimalsResult = connectorTokenContract.try_decimals();
  if(!connectorTokenDecimalsResult.reverted) {
    connectorTokenEntity.decimals = connectorTokenDecimalsResult.value;
  }
  let connectorTokenConverters = connectorTokenEntity.converters || [];
  connectorTokenConverters.push(converterAddress.toHex());
  log.debug("Connector Token Converters: {}", [connectorTokenConverters.toString()])
  connectorTokenEntity.converters = connectorTokenConverters;
  connectorTokenEntity.save();

  let smartTokenConnectorTokens = smartTokenEntity.connectorTokens || [];
  smartTokenConnectorTokens.push(connectorTokenAddress.toHex());
  log.debug("Smart Token Connector Tokens: {}", [smartTokenConnectorTokens.toString()])
  smartTokenEntity.connectorTokens = smartTokenConnectorTokens;
  let smartTokenNameResult = smartTokenContract.try_name();
  if(!smartTokenNameResult.reverted) {
    smartTokenEntity.name = smartTokenNameResult.value;
  }
  let smartTokenSymbolResult = smartTokenContract.try_symbol();
  if(!smartTokenSymbolResult.reverted) {
    smartTokenEntity.symbol = smartTokenSymbolResult.value;
  }
  let smartTokenDecimalsResult = smartTokenContract.try_decimals();
  if(!smartTokenDecimalsResult.reverted) {
    smartTokenEntity.decimals = smartTokenDecimalsResult.value;
  }
  
  let smartTokenConverters = smartTokenEntity.converters || [];
  smartTokenConverters.push(converterAddress.toHex());
  log.debug("Smart Token Converters: {}", [smartTokenConverters.toString()])
  smartTokenEntity.converters = smartTokenConverters;
  let smartTokenVersionResult = smartTokenContract.try_version();
  if(!smartTokenVersionResult.reverted) {
    smartTokenEntity.version = smartTokenVersionResult.value;
  }
  let smartTokenStandardResult = smartTokenContract.try_standard();
  if(!smartTokenStandardResult.reverted) {
    smartTokenEntity.standard = smartTokenStandardResult.value;
  }
  let smartTokenTransfersEnabledResult = smartTokenContract.try_transfersEnabled();
  if(!smartTokenTransfersEnabledResult.reverted) {
    smartTokenEntity.transfersEnabled = smartTokenTransfersEnabledResult.value;
  }

  converterEntity.smartToken = smartTokenAddress.toHex();
  // let converterVersionResult = converterContract.try_version();
  // if(!converterVersionResult.reverted) {
  //   converterEntity.version = converterVersionResult.value;
  // }
  // let converterConnectorTokens = converterEntity.connectorTokens || [];
  // converterConnectorTokens.push(connectorTokenAddress.toHex());
  // log.debug("Converter Connector Tokens: {}", [converterConnectorTokens.toString()])
  // converterEntity.connectorTokens = converterConnectorTokens;
  let converterOwnerResult = converterContract.try_owner();
  if(!converterOwnerResult.reverted) {
    converterEntity.owner = converterOwnerResult.value.toHex();
  }
  let converterManagerResult = converterContract.try_manager();
  if(!converterManagerResult.reverted) {
    converterEntity.manager = converterManagerResult.value.toHex();
  }
  let converterConnectorCountResult = converterContract.try_connectorTokenCount();
  if(!converterConnectorCountResult.reverted){
    if(converterConnectorCountResult.value == 2) {
      smartTokenEntity.smartTokenType = "Relay";
    } else {
      smartTokenEntity.smartTokenType = "Liquid";
    }
  }
  let converterMaxConversionFeeResult = converterContract.try_maxConversionFee();
  if(!converterMaxConversionFeeResult.reverted){
    converterEntity.maxConversionFee = converterMaxConversionFeeResult.value;
  }
  let converterTypeResult = converterContract.try_converterType();
  if(!converterTypeResult.reverted){
    converterEntity.type = converterTypeResult.value;
  }
  if(converterQBPLength != null && converterQBPLength > 0) {
    converterEntity.quickBuyPathLength = converterQBPLength;
    converterEntity.quickBuyPath = converterQuickBuyPath;
  }

  let converterRegistryEntity = ConverterRegistry.load(event.address.toHex());
  if (converterRegistryEntity == null) {
    converterRegistryEntity = new ConverterRegistry(event.address.toHex());
  }
  let converterRegistryConverters = converterRegistryEntity.converters || [];
  converterRegistryConverters.push(converterAddress.toHex())
  log.debug("Converter Registry Converters: {}", [converterRegistryConverters.toString()]);
  converterRegistryEntity.converters = converterRegistryConverters;

  let converterRegistrySmartTokens = converterRegistryEntity.smartTokens || [];
  converterRegistrySmartTokens.push(smartTokenAddress.toHex());
  log.debug("Converter Registry Smart Tokens: {}", [converterRegistrySmartTokens.toString()]);
  converterRegistryEntity.smartTokens = converterRegistrySmartTokens;

  let converterRegistryConnectorTokens = converterRegistryEntity.connectorTokens || [];
  converterRegistryConnectorTokens.push(connectorTokenAddress.toHex());
  log.debug("Converter Registry Connector Tokens: {}", [converterRegistryConnectorTokens.toString()]);
  converterRegistryEntity.connectorTokens = converterRegistryConnectorTokens;
  converterRegistryEntity.save();
  smartTokenEntity.save();
  converterEntity.save();
}

export function handleConverterRemoval(event: ConverterRemoval): void {
  log.debug("Converter removed from registry: {}, Token: {}", [event.params._address.toHex(), event.params._token.toHex()]);
  let converterRegistryEntity = ConverterRegistry.load(event.address.toHex());
  if (converterRegistryEntity == null) {
    converterRegistryEntity = new ConverterRegistry(event.address.toHex());
  }
  let convertersRegistered = converterRegistryEntity.converters || [];
  let index = convertersRegistered.indexOf(event.params._token.toHex(), 0);
  if (index > -1) {
    convertersRegistered.splice(index, 1);
  }
  converterRegistryEntity.converters = convertersRegistered;
  converterRegistryEntity.save();
}

export function handleConverterRegistryOwnerUpdate(event: ConverterRegistryOwnerUpdate): void {
  let converterRegistryEntity = new ConverterRegistry(event.address.toHex());
  converterRegistryEntity.owner = event.params._newOwner.toHex();
  converterRegistryEntity.save();
}


// Converter events
// TODO: Add in name, symbol, etc. for toToken and fromToken once try_method fixed by graph
export function handleConversion(event: Conversion): void {
  log.debug("Conversion event triggered: {}, From Token: {}, To Token: {}, Amount: {}", [event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.params._trader.toHex(), event.params._fromToken.toHex(), event.params._toToken.toHex(), event.params._amount.toString()])
  let swap = new Swap(event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.params._trader.toHex());
  let fromToken = new Token(event.params._fromToken.toHex());
  let toToken = new Token(event.params._toToken.toHex());
  swap.fromToken = event.params._fromToken.toHex();
  swap.toToken = event.params._toToken.toHex();
  swap.converterUsed = event.address.toHex();
  swap.amountPurchased = event.params._amount;
  swap.amountReturned = event.params._return;
  swap.conversionFee = event.params._conversionFee;
  swap.trader = event.params._trader.toHex();
  fromToken.save();
  toToken.save();
  swap.save();
}

export function handlePriceDataUpdate(event: PriceDataUpdate): void {
  log.debug("PriceDataUpdate emitted for converter: {}, Token Supply: {}, Connector Balance: {}, Connector Weight {}", [event.address.toHex(), event.params._tokenSupply.toString(), event.params._connectorBalance.toString(), event.params._connectorWeight.toString()])
  let converterEntity = Converter.load(event.address.toHex());
  if(converterEntity === null) {
    converterEntity = new Converter(event.address.toHex());
  }
  converterEntity.bntBalance = event.params._tokenSupply;
  converterEntity.tokenBalance = event.params._connectorBalance;
  converterEntity.weight = event.params._connectorWeight;
  converterEntity.save()
}

export function handleConversionFeeUpdate(event: ConversionFeeUpdate): void {
  log.debug("Conversion Fee updated for converter: {}, New fee: {}, Previous fee: {}", [event.address.toHex(), event.params._newFee.toString(),  event.params._prevFee.toString()])
  let converterEntity = Converter.load(event.address.toHex());
  converterEntity.conversionFee = event.params._newFee;
  converterEntity.save();
}

export function handleManagerUpdate(event: ManagerUpdate): void {
  log.debug("Manager updated for converter: {}, New manager: {}, Previous manager: {}", [event.address.toHex(), event.params._newManager.toHex(), event.params._prevManager.toHex()])
  let converterEntity = Converter.load(event.address.toHex());
  converterEntity.manager = event.params._newManager.toHex();
  converterEntity.save();
}

export function handleConverterOwnerUpdate(event: ConverterOwnerUpdate): void {
  let converterEntity = Converter.load(event.address.toHex());
  converterEntity.owner = event.params._newOwner.toHex();
  converterEntity.save();
}



// Smart Token events
export function handleNewSmartToken(event: NewSmartToken): void {
    // let smartToken = new SmartToken(event.address.toHex());
    // let contract = SmartTokenContract.bind(event.address);
    // smartToken.targetTokenName = contract.name();
    // smartToken.targetTokenSymbol = contract.symbol();
    // smartToken.targetTokenDecimals = contract.decimals();
    // smartToken.save()
}

export function handleIssuance(event: Issuance): void {}

export function handleDestruction(event: Destruction): void {}

export function handleTransfer(event: Transfer): void {}

export function handleApproval(event: Approval): void {}

export function handleSmartTokenOwnerUpdate(event: SmartTokenOwnerUpdate): void {
  let smartTokenEntity = new Token(event.address.toHex());
  smartTokenEntity.owner = event.params._newOwner.toHex();
  smartTokenEntity.save();
}