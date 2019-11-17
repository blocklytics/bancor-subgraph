import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  AddressUpdate,
  OwnerUpdate as ContractRegistryOwnerUpdate
} from "../generated/ContractRegistryContract/ContractRegistryContract"
import { 
  NewConverter 
} from "../generated/ConverterFactoryContract/ConverterFactoryContract"
import {
  TokenAddition,
  TokenRemoval,
  ConverterAddition,
  ConverterRemoval,
  OwnerUpdate as ConverterRegistryOwnerUpdate
} from "../generated/ConverterRegistryContract/ConverterRegistryContract"
import {
  ConverterContract,
  Conversion,
  ConversionFeeUpdate,
  ManagerUpdate,
  PriceDataUpdate,
  OwnerUpdate as ConverterOwnerUpdate
} from "../generated/templates/ConverterContract/ConverterContract"
import {
  SmartTokenContract,
  NewSmartToken,
  Issuance,
  Destruction,
  Transfer,
  Approval,
  OwnerUpdate as SmartTokenOwnerUpdate
} from "../generated/templates/SmartTokenContract/SmartTokenContract"
import {
  ERC20Contract
} from "../generated/templates/ERC20Contract/ERC20Contract"
import {
  // ConverterRegistryContract as ConverterRegistryTemplate, 
  SmartTokenContract as SmartTokenTemplate, 
  ConverterContract as ConverterTemplate
} from "../generated/templates"
import { 
  ConverterRegistry,
  Converter, 
  Token, 
  Connector,
  Swap 
} from "../generated/schema"

// Contract Registry events
export function handleAddressUpdate(event: AddressUpdate): void {
  let contractName = event.params._contractName.toString();
  let contractAddress = event.params._contractAddress.toHex();
  log.debug("Contract registry address updated: {} is now at {}", [contractName, contractAddress]);
  // if(contractName == "BancorConverterRegistry") {
  //   ConverterRegistryTemplate.create(event.params._contractAddress);
  // }
  
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  // let entity = ExampleEntity.load(event.transaction.from.toHex())

  // // Entities only exist after they have been saved to the store;
  // // `null` checks allow to create entities on demand
  // if (entity == null) {
  //   entity = new ExampleEntity(event.transaction.from.toHex())

  //   // Entity fields can be set using simple assignments
  //   entity.count = BigInt.fromI32(0)
  // }

  // // BigInt and BigDecimal math are supported
  // entity.count = entity.count + BigInt.fromI32(1)

  // // Entity fields can be set based on event parameters
  // entity._contractName = event.params._contractName
  // entity._contractAddress = event.params._contractAddress

  // // Entities can be written to the store with `.save()`
  // entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.getAddress(...)
  // - contract.contractNames(...)
  // - contract.itemCount(...)
  // - contract.owner(...)
  // - contract.addressOf(...)
  // - contract.newOwner(...)
}

export function handleContractRegistryOwnerUpdate(event: ContractRegistryOwnerUpdate): void {}

// Converter Factory events
export function handleNewConverter(event: NewConverter): void {
  log.debug("Converter created: {}", [event.params._converter.toHex()]);
  
  // let converterEntity = new Converter(event.params._converter.toHex());
  // converterEntity.token = event.params._owner.toHex();
  // converterEntity.save();
}

// Converter Registry events
export function handleTokenAddition(event: TokenAddition): void {}

export function handleTokenRemoval(event: TokenRemoval): void {}

export function handleConverterAddition(event: ConverterAddition): void {
  log.debug("Converter added to registry: {}, Token: {}", [event.params._address.toHex(), event.params._token.toHex()]);
  let converterAddress = event.params._address;
  let converterContract = ConverterContract.bind(converterAddress);
  let converterEntity = Converter.load(converterAddress.toHex());
  if(converterEntity == null) {
    ConverterTemplate.create(event.params._address);
    converterEntity = new Converter(converterAddress.toHex());
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
  connectorTokenEntity.isSmartToken = false;
  connectorTokenEntity.name = connectorTokenContract.name();
  connectorTokenEntity.symbol = connectorTokenContract.symbol();
  connectorTokenEntity.decimals = connectorTokenContract.decimals();
  connectorTokenEntity.converters.push(converterAddress.toHex());
  connectorTokenEntity.save();

  smartTokenEntity.connectorTokens.push(connectorTokenAddress.toHex());
  smartTokenEntity.name = smartTokenContract.name();
  smartTokenEntity.symbol = smartTokenContract.symbol();
  smartTokenEntity.decimals = smartTokenContract.decimals();
  smartTokenEntity.converters.push(converterAddress.toHex());
  smartTokenEntity.version = smartTokenContract.version();
  smartTokenEntity.standard = smartTokenContract.standard();
  smartTokenEntity.transfersEnabled = smartTokenContract.transfersEnabled();
  smartTokenEntity.save()

  converterEntity.smartToken = smartTokenAddress.toHex();
  converterEntity.version = converterContract.version();
  converterEntity.connectorTokens.push(connectorTokenAddress.toHex());
  converterEntity.owner = converterContract.owner().toHex();
  converterEntity.manager = converterContract.manager().toHex();
  if(converterContract.connectorTokenCount() == 2) {
    smartTokenEntity.smartTokenType = "Relay"
  }
  converterEntity.maxConversionFee = converterContract.maxConversionFee();
  converterEntity.type = converterContract.converterType();

  converterEntity.save();
}

export function handleConverterRemoval(event: ConverterRemoval): void {
  log.debug("Converter removed from registry: {}, Token: {}", [event.params._address.toHex(), event.params._token.toHex()]);
}

export function handleConverterRegistryOwnerUpdate(event: ConverterRegistryOwnerUpdate): void {}


// Converter events
export function handleConversion(event: Conversion): void {
  log.debug("Conversion event triggered: {}, From Token: {}, To Token: {}, Amount: {}", [event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.params._trader.toHex(), event.params._fromToken.toHex(), event.params._toToken.toHex(), event.params._amount.toString()])
  let swap = new Swap(event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.params._trader.toHex());
  swap.fromToken = event.params._fromToken.toHex();
  swap.toToken = event.params._toToken.toHex();
  swap.converterUsed = event.address.toHex();
  swap.amountPurchased = event.params._amount;
  swap.amountReturned = event.params._return;
  swap.conversionFee = event.params._conversionFee;
  swap.trader = event.params._trader.toHex();
  swap.save();
}

export function handlePriceDataUpdate(event: PriceDataUpdate): void {
  log.debug("PriceDataUpdate emitted for converter: {}, Token Supply: {}, Connector Balance: {}, Connector Weight {}", [event.address.toHex(), event.params._tokenSupply.toString(), event.params._connectorBalance.toString(), event.params._connectorWeight.toString()])
  let converterEntity = Converter.load(event.address.toHex());
  if(converterEntity === null) {
    converterEntity = new Converter(event.address.toHex());
  }
  // converterEntity.token = event.params._connectorToken.toHex();
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

export function handleSmartTokenOwnerUpdate(event: SmartTokenOwnerUpdate): void {}