import {
  BigInt,
  log
} from "@graphprotocol/graph-ts"
import {
  ConverterContract,
  Conversion,
  ConversionFeeUpdate,
  ManagerUpdate,
  PriceDataUpdate,
  UpgradeCall,
  OwnerUpdate as ConverterOwnerUpdate,
  VirtualBalancesEnable
} from "../../generated/templates/ConverterContract/ConverterContract"
import {
  ConverterContractOld
} from "../../generated/templates/ConverterContract/ConverterContractOld"
import {
  ERC20Contract
} from "../../generated/templates/ConverterContract/ERC20Contract"
import {
  Converter,
  Connector,
  Token,
  Swap,
  Transaction,
  User,
  UserTokenSwapTotal,
  TokenSwapTotal,
  ConverterTokenBalance,
  ConverterTokenSwapTotal
} from "../../generated/schema"

// Converter events
export function handleConversion(event: Conversion): void {
  log.debug("Conversion event triggered: {}, From Token: {}, To Token: {}, Amount: {}", [event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.transaction.from.toHex(), event.params._fromToken.toHex(), event.params._toToken.toHex(), event.params._amount.toString()])
  let swap = new Swap(event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.transaction.from.toHex());
  let fromToken = new Token(event.params._fromToken.toHex());
  let toToken = new Token(event.params._toToken.toHex());
  let transaction = new Transaction(event.transaction.hash.toHex());
  let trader = User.load(event.transaction.from.toHex());
  if (trader == null) {
    trader = new User(event.transaction.from.toHex());
  }
  let fromTokenContract = ERC20Contract.bind(event.params._fromToken);
  if (event.params._fromToken.toHex() == "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2") {
    fromToken.name = "Maker";
    fromToken.symbol = "MKR";
  } else if (event.params._fromToken.toHex() == "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359") {
    fromToken.name = "Sai Stablecoin";
    fromToken.symbol = "SAI";
  } else if (event.params._fromToken.toHex() == "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a") {
    fromToken.name = "DigixDAO";
    fromToken.symbol = "DGD";
  } else if (event.params._fromToken.toHex() == "0xf1290473e210b2108a85237fbcd7b6eb42cc654f") {
    fromToken.name = "HedgeTrade";
    fromToken.symbol = "HEDG";
  } 
  else {
    let fromTokenNameResult = fromTokenContract.try_name();
    if (!fromTokenNameResult.reverted) {
      fromToken.name = fromTokenNameResult.value;
    }
    let fromTokenSymbolResult = fromTokenContract.try_symbol();
    if (!fromTokenSymbolResult.reverted) {
      fromToken.symbol = fromTokenSymbolResult.value;
    }
  }
  let fromTokenDecimalsResult = fromTokenContract.try_decimals();
  if (!fromTokenDecimalsResult.reverted) {
    fromToken.decimals = fromTokenDecimalsResult.value;
  }

  let toTokenContract = ERC20Contract.bind(event.params._toToken);
  if (event.params._toToken.toHex() == "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2") {
    toToken.name = "Maker";
    toToken.symbol = "MKR";
  } else if (event.params._toToken.toHex() == "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359") {
    toToken.name = "Sai Stablecoin";
    toToken.symbol = "SAI";
  } else if (event.params._toToken.toHex() == "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a") {
    toToken.name = "DigixDAO";
    toToken.symbol = "DGD";
  } else if (event.params._toToken.toHex() == "0xf1290473e210b2108a85237fbcd7b6eb42cc654f") {
    toToken.name = "HedgeTrade";
    toToken.symbol = "HEDG";
  } 
  else {
    let toTokenNameResult = toTokenContract.try_name();
    if (!toTokenNameResult.reverted) {
      toToken.name = toTokenNameResult.value;
    }
    let toTokenSymbolResult = toTokenContract.try_symbol();
    if (!toTokenSymbolResult.reverted) {
      toToken.symbol = toTokenSymbolResult.value;
    }
  }
  let toTokenDecimalsResult = toTokenContract.try_decimals();
  if (!toTokenDecimalsResult.reverted) {
    toToken.decimals = toTokenDecimalsResult.value;
  }
  let amountPurchased = event.params._amount;
  let amountReturned = event.params._return;
  let fromTokenBalanceAfterSwap = fromTokenContract.balanceOf(event.address);
  let toTokenBalanceAfterSwap = toTokenContract.balanceOf(event.address);
  let fromTokenBalanceBeforeSwap = fromTokenBalanceAfterSwap.plus(amountPurchased);
  let toTokenBalanceBeforeSwap = toTokenBalanceAfterSwap.minus(amountReturned);
  let originalPrice = fromTokenBalanceBeforeSwap.toBigDecimal().div(toTokenBalanceBeforeSwap.toBigDecimal());
  let actualPrice = amountPurchased.toBigDecimal().div(amountReturned.toBigDecimal());
  let slippage = (originalPrice.minus(actualPrice)).div(originalPrice);
  swap.fromToken = event.params._fromToken.toHex();
  swap.toToken = event.params._toToken.toHex();
  swap.converterUsed = event.address.toHex();
  swap.amountPurchased = amountPurchased;
  swap.amountReturned = amountReturned
  swap.conversionFee = event.params._conversionFee;
  swap.trader = event.transaction.from.toHex();
  swap.transaction = event.transaction.hash.toHex();
  swap.logIndex = event.logIndex.toI32();
  swap.timestamp = event.block.timestamp;
  swap.price = actualPrice;
  swap.inversePrice = amountReturned.toBigDecimal().div(amountPurchased.toBigDecimal());
  swap.converterFromTokenBalanceBeforeSwap = fromTokenBalanceBeforeSwap;
  swap.converterFromTokenBlanceAfterSwap = fromTokenBalanceAfterSwap;
  swap.converterToTokenBalanceBeforeSwap = toTokenBalanceBeforeSwap;
  swap.converterToTokenBalanceAfterSwap = toTokenBalanceAfterSwap;
  swap.slippage = slippage;
  transaction.blockNumber = event.block.number;
  transaction.blockTimestamp = event.block.timestamp;
  transaction.gasUsed = event.transaction.gasUsed;
  transaction.gasPrice = event.transaction.gasPrice;
  trader.numSwaps = trader.numSwaps.plus(BigInt.fromI32(1));
  let userTokenSwapId = event.transaction.from.toHex() + "-" + event.params._fromToken.toHex() + "-" + event.params._toToken.toHex();
  let userTokenSwapTotal = UserTokenSwapTotal.load(userTokenSwapId);
  if (userTokenSwapTotal == null) {
    userTokenSwapTotal = new UserTokenSwapTotal(userTokenSwapId);
    userTokenSwapTotal.user = event.transaction.from.toHex();
    userTokenSwapTotal.fromToken = event.params._fromToken.toHex();
    userTokenSwapTotal.toToken = event.params._toToken.toHex();
    userTokenSwapTotal.totalAmountPurchased = BigInt.fromI32(0);
    userTokenSwapTotal.totalAmountReturned = BigInt.fromI32(0);
  }
  userTokenSwapTotal.totalAmountPurchased = userTokenSwapTotal.totalAmountPurchased.plus(event.params._amount);
  userTokenSwapTotal.totalAmountReturned = userTokenSwapTotal.totalAmountReturned.plus(event.params._return);
  let tokenSwapId = event.params._fromToken.toHex() + "-" + event.params._toToken.toHex();
  let tokenSwapTotal = TokenSwapTotal.load(tokenSwapId);
  if (tokenSwapTotal == null) {
    tokenSwapTotal = new TokenSwapTotal(tokenSwapId);
    tokenSwapTotal.fromToken = event.params._fromToken.toHex();
    tokenSwapTotal.toToken = event.params._toToken.toHex();
    tokenSwapTotal.totalAmountPurchased = BigInt.fromI32(0);
    tokenSwapTotal.totalAmountReturned = BigInt.fromI32(0);
  }
  tokenSwapTotal.totalAmountPurchased = tokenSwapTotal.totalAmountPurchased.plus(event.params._amount);
  tokenSwapTotal.totalAmountReturned = tokenSwapTotal.totalAmountReturned.plus(event.params._return);
  let converterTokenSwapId = event.address.toHex() + "-" + event.params._fromToken.toHex() + "-" + event.params._toToken.toHex();
  let converterTokenSwapTotal = ConverterTokenSwapTotal.load(converterTokenSwapId);
  if (converterTokenSwapTotal == null) {
    converterTokenSwapTotal = new ConverterTokenSwapTotal(converterTokenSwapId);
    converterTokenSwapTotal.fromToken = event.params._fromToken.toHex();
    converterTokenSwapTotal.toToken = event.params._toToken.toHex();
    converterTokenSwapTotal.totalAmountPurchased = BigInt.fromI32(0);
    converterTokenSwapTotal.totalAmountReturned = BigInt.fromI32(0);
    converterTokenSwapTotal.converter = event.address.toHex();
  }
  converterTokenSwapTotal.totalAmountPurchased = converterTokenSwapTotal.totalAmountPurchased.plus(event.params._amount);
  converterTokenSwapTotal.totalAmountReturned = converterTokenSwapTotal.totalAmountReturned.plus(event.params._return);
  trader.save();
  transaction.save();
  fromToken.save();
  toToken.save();
  swap.save();
  userTokenSwapTotal.save();
  tokenSwapTotal.save();
  converterTokenSwapTotal.save();
}

export function handlePriceDataUpdate(event: PriceDataUpdate): void {
  log.debug("PriceDataUpdate emitted for converter: {}, Token Supply: {}, Connector Balance: {}, Connector Weight {}", [event.address.toHex(), event.params._tokenSupply.toString(), event.params._connectorBalance.toString(), event.params._connectorWeight.toString()])
  let converterEntity = new Converter(event.address.toHex());
  converterEntity.weight = event.params._connectorWeight;
  let converterAddress = event.address;
  let converterContract = ConverterContract.bind(converterAddress);
  let converterToken = converterContract.token();
  let tokenAddress = event.params._connectorToken;

  let converterTokenBalanceID = converterAddress.toHex() + "-" + tokenAddress.toHex();
  let converterTokenBalance = ConverterTokenBalance.load(converterTokenBalanceID);
  if (converterTokenBalance === null) {
    converterTokenBalance = new ConverterTokenBalance(converterTokenBalanceID);
  }
  converterTokenBalance.converter = converterAddress.toHex();
  converterTokenBalance.token = tokenAddress.toHex();
  converterTokenBalance.balance = event.params._connectorBalance;
  if(converterTokenBalance.balance == BigInt.fromI32(0)) {
    converterEntity.lastResetBlockNumber = event.block.number;
    converterEntity.lastResetTimestamp = event.block.timestamp;
  }

  let converterSmartTokenBalanceID = converterAddress.toHex() + "-" + converterToken.toHex();
  let converterSmartTokenBalance = ConverterTokenBalance.load(converterSmartTokenBalanceID);
  if (converterSmartTokenBalance === null) {
    converterSmartTokenBalance = new ConverterTokenBalance(converterSmartTokenBalanceID);
  }
  converterSmartTokenBalance.converter = converterAddress.toHex();
  converterSmartTokenBalance.token = converterToken.toHex();
  converterSmartTokenBalance.balance = event.params._tokenSupply;
  converterTokenBalance.save();
  converterSmartTokenBalance.save();
  converterEntity.save()
}

export function handleConversionFeeUpdate(event: ConversionFeeUpdate): void {
  log.debug("Conversion Fee updated for converter: {}, New fee: {}, Previous fee: {}", [event.address.toHex(), event.params._newFee.toString(), event.params._prevFee.toString()])
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

export function handleUpgrade(call: UpgradeCall): void {
  // let converterAddress = call.to;
  // let converterEntity = Converter.load(converterAddress.toHex());
  // let converterTokenBalances = converterEntity.tokenBalances as Array < string > ;
  // for (var i = 0; i < converterTokenBalances.length; i++) {
  //   let converterTokenBalanceID = converterTokenBalances[i];
  //   let converterTokenBalanceEntity = ConverterTokenBalance.load(converterTokenBalanceID);
  //   if (converterTokenBalanceEntity == null) {
  //     converterTokenBalanceEntity = new ConverterTokenBalance(converterTokenBalanceID);
  //   }
  //   converterTokenBalanceEntity.balance = BigInt.fromI32(0);
  //   converterEntity.lastResetBlockNumber = call.block.number;
  //   converterEntity.lastResetTimestamp = call.block.timestamp;
  //   converterEntity.save();
  //   converterTokenBalanceEntity.save();
  // }
}

export function handleVirtualBalancesEnable(event: VirtualBalancesEnable): void {
  let converterAddress = event.address;
  log.debug("VirtualBalancesEnable event fired - Converter: {}", [converterAddress.toHex()]);
  let converterEntity = Converter.load(converterAddress.toHex());
  let converterContract = ConverterContract.bind(converterAddress);
  if (converterEntity == null) {
    converterEntity = new Converter(converterAddress.toHex());
  }
  let converterConnectorTokenCountResult = converterContract.try_connectorTokenCount();
  let converterConnectorTokens: string[] = [];
  if (!converterConnectorTokenCountResult.reverted) {
    let numConnectorTokens = converterConnectorTokenCountResult.value;
    log.debug("VirtualBalancesEnable connectorTokens count {} - Converter: {}", [numConnectorTokens.toString(), converterAddress.toHex()]);
    converterConnectorTokens = [];
    for (let i = 0; i < numConnectorTokens; i++) {
      let connectorTokenResult = converterContract.try_connectorTokens(BigInt.fromI32(i));
      if (!connectorTokenResult.reverted) {
        let connectorTokenAddress = connectorTokenResult.value;
        log.debug("VirtualBalancesEnable connectorToken address {} - Converter: {}", [connectorTokenAddress.toHex(), converterAddress.toHex()]);
        converterConnectorTokens.push(connectorTokenAddress.toHex());
        let converterConnectorsResult = converterContract.try_connectors(connectorTokenAddress);
        let connectorEntity = new Connector(converterAddress.toHex() + "-" + connectorTokenAddress.toHex());
        connectorEntity.converter = converterAddress.toHex();
        connectorEntity.connectorToken = connectorTokenAddress.toHex();
        if (converterConnectorsResult.reverted) {
          let converterContractOld = ConverterContractOld.bind(converterAddress);
          let converterConnectorsOldResult = converterContractOld.try_connectors(connectorTokenAddress);
          if(!converterConnectorsOldResult.reverted) {
            log.debug("VirtualBalancesEnable Old connectors not reverted - Converter: {}", [converterAddress.toHex()]);
            connectorEntity.virtualBalance = converterConnectorsResult.value.value0;
            connectorEntity.weight = converterConnectorsResult.value.value1;
            connectorEntity.isVirtualBalanceEnabled = converterConnectorsResult.value.value2;
            connectorEntity.isPurchaseEnabled = converterConnectorsResult.value.value3;
            connectorEntity.isSet = converterConnectorsResult.value.value4;
          }
        }
        else {
          log.debug("VirtualBalancesEnable connectors not reverted - Converter: {}", [converterAddress.toHex()]);
          connectorEntity.virtualBalance = converterConnectorsResult.value.value0;
          connectorEntity.weight = converterConnectorsResult.value.value1;
          connectorEntity.isVirtualBalanceEnabled = converterConnectorsResult.value.value2;
          connectorEntity.isPurchaseEnabled = converterConnectorsResult.value.value3;
          connectorEntity.isSet = converterConnectorsResult.value.value4;
        }
        connectorEntity.save();
      }
    }
    converterEntity.connectorTokens = converterConnectorTokens;
  }
  converterEntity.save();
}