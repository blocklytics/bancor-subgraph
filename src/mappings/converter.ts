import { BigInt, log } from "@graphprotocol/graph-ts"
import {
    ConverterContract,
    Conversion,
    ConversionFeeUpdate,
    ManagerUpdate,
    PriceDataUpdate,
    UpgradeCall,
    OwnerUpdate as ConverterOwnerUpdate
  } from "../../generated/templates/ConverterContract/ConverterContract"
  import {
    ERC20Contract
  } from "../../generated/templates/ConverterContract/ERC20Contract"
  import {
    Converter, 
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
    if(trader == null) {
        trader = new User(event.transaction.from.toHex());
    }
    let fromTokenContract = ERC20Contract.bind(event.params._fromToken);
    let toTokenContract = ERC20Contract.bind(event.params._toToken);
    let fromTokenNameResult =  fromTokenContract.try_name();
    if(!fromTokenNameResult.reverted) {
      fromToken.name = fromTokenNameResult.value;
    } 
    // else {
    //   let fromTokenNameResultBytes = fromTokenContract.try_name1();
    //   if(!fromTokenNameResultBytes.reverted) {
    //     fromToken.name = fromTokenNameResultBytes.value.toHex();
    //   }
    // }
    let fromTokenSymbolResult = fromTokenContract.try_symbol();
    if(!fromTokenSymbolResult.reverted) {
        fromToken.symbol = fromTokenSymbolResult.value;
    } 
    // else {
    //   let fromTokenSymbolResultBytes = fromTokenContract.try_symbol1();
    //   if(!fromTokenSymbolResultBytes.reverted) {
    //     fromToken.symbol = fromTokenSymbolResultBytes.value.toHex();
    //   }
    // }
    let fromTokenDecimalsResult = fromTokenContract.try_decimals();
    if(!fromTokenDecimalsResult.reverted) {
        fromToken.decimals = fromTokenDecimalsResult.value;
    } 
    // else {
    //   fromTokenDecimalsResult = fromTokenContract.try_DECIMALS();
    //   if(!fromTokenDecimalsResult.reverted) {
    //     fromToken.decimals = fromTokenDecimalsResult.value;
    //   }
    // }
    let toTokenNameResult =  toTokenContract.try_name();
    if(!toTokenNameResult.reverted) {
      toToken.name = toTokenNameResult.value;
    } 
    // else {
    //   let toTokenNameResultBytes = toTokenContract.try_name1();
    //   if(!toTokenNameResultBytes.reverted) {
    //     toToken.name = toTokenNameResultBytes.value.toHex();
    //   }
    // }
    let toTokenSymbolResult = toTokenContract.try_symbol();
    if(!toTokenSymbolResult.reverted) {
        toToken.symbol = toTokenSymbolResult.value;
    } 
    // else {
    //   let toTokenSymbolResultBytes = toTokenContract.try_symbol1();
    //   if(!toTokenSymbolResultBytes.reverted) {
    //     toToken.symbol = toTokenSymbolResultBytes.value.toHex();
    //   }
    // }
    let toTokenDecimalsResult = toTokenContract.try_decimals();
    if(!toTokenDecimalsResult.reverted) {
        toToken.decimals = toTokenDecimalsResult.value;
    } 
    // else {
    //   toTokenDecimalsResult = toTokenContract.try_DECIMALS();
    //   if(!toTokenDecimalsResult.reverted) {
    //     toToken.decimals = toTokenDecimalsResult.value;
    //   }
    // }
    swap.fromToken = event.params._fromToken.toHex();
    swap.toToken = event.params._toToken.toHex();
    swap.converterUsed = event.address.toHex();
    swap.amountPurchased = event.params._amount;
    swap.amountReturned = event.params._return;
    swap.conversionFee = event.params._conversionFee;
    swap.trader = event.transaction.from.toHex();
    swap.transaction = event.transaction.hash.toHex();
    swap.logIndex = event.logIndex.toI32();
    swap.timestamp = event.block.timestamp;
    transaction.blockNumber = event.block.number;
    transaction.blockTimestamp = event.block.timestamp;
    transaction.gasUsed = event.transaction.gasUsed;
    transaction.gasPrice = event.transaction.gasPrice;
    trader.numSwaps = trader.numSwaps.plus(BigInt.fromI32(1));
    let userTokenSwapId = event.transaction.from.toHex() + "-" + event.params._fromToken.toHex() + "-" + event.params._toToken.toHex();
    let userTokenSwapTotal = UserTokenSwapTotal.load(userTokenSwapId);
    if(userTokenSwapTotal == null) {
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
    if(tokenSwapTotal == null) {
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
    if(converterTokenSwapTotal == null) {
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
    if(converterTokenBalance === null) {
      converterTokenBalance = new ConverterTokenBalance(converterTokenBalanceID);
    }
    converterTokenBalance.converter = converterAddress.toHex();
    converterTokenBalance.token = tokenAddress.toHex();
    converterTokenBalance.balance = event.params._connectorBalance;

    let converterSmartTokenBalanceID = converterAddress.toHex() + "-" + converterToken.toHex();
    let converterSmartTokenBalance = ConverterTokenBalance.load(converterSmartTokenBalanceID);
    if(converterSmartTokenBalance === null) {
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

  export function handleUpgrade(call: UpgradeCall): void {
    let converterAddress = call.to;
    let converterEntity = Converter.load(converterAddress.toHex());
    let converterTokenBalances = converterEntity.tokenBalances as Array<string>;
    for(var i = 0; i < converterTokenBalances.length; i++) {
      let converterTokenBalanceID = converterTokenBalances[i];
      let converterTokenBalanceEntity = ConverterTokenBalance.load(converterTokenBalanceID);
      if (converterTokenBalanceEntity == null) {
        converterTokenBalanceEntity = new ConverterTokenBalance(converterTokenBalanceID);
      }
      converterTokenBalanceEntity.balance = BigInt.fromI32(0);
      converterTokenBalanceEntity.save();
    }
  }