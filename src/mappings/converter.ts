import { BigInt, log } from "@graphprotocol/graph-ts"
import {
    Conversion,
    ConversionFeeUpdate,
    ManagerUpdate,
    PriceDataUpdate,
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
    ConverterTokenSwapTotal
  } from "../../generated/schema"

// Converter events
export function handleConversion(event: Conversion): void {
    log.debug("Conversion event triggered: {}, From Token: {}, To Token: {}, Amount: {}", [event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.params._trader.toHex(), event.params._fromToken.toHex(), event.params._toToken.toHex(), event.params._amount.toString()])
    let swap = new Swap(event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-" + event.params._trader.toHex());
    let fromToken = new Token(event.params._fromToken.toHex());
    let toToken = new Token(event.params._toToken.toHex());
    let transaction = new Transaction(event.transaction.hash.toHex());
    let trader = User.load(event.params._trader.toHex());
    if(trader == null) {
        trader = new User(event.params._trader.toHex());
    }
    let fromTokenContract = ERC20Contract.bind(event.params._fromToken);
    let toTokenContract = ERC20Contract.bind(event.params._toToken);
    let fromTokenNameResult =  fromTokenContract.try_name();
    if(!fromTokenNameResult.reverted) {
      fromToken.name = fromTokenNameResult.value;
    }
    let fromTokenSymbolResult = fromTokenContract.try_symbol();
    if(!fromTokenSymbolResult.reverted) {
        fromToken.symbol = fromTokenSymbolResult.value;
    }
    let fromTokenDecimalsResult = fromTokenContract.try_decimals();
    if(!fromTokenDecimalsResult.reverted) {
        fromToken.decimals = fromTokenDecimalsResult.value;
    }
    let toTokenNameResult =  toTokenContract.try_name();
    if(!toTokenNameResult.reverted) {
      toToken.name = toTokenNameResult.value;
    }
    let toTokenSymbolResult = toTokenContract.try_symbol();
    if(!toTokenSymbolResult.reverted) {
        toToken.symbol = toTokenSymbolResult.value;
    }
    let toTokenDecimalsResult = toTokenContract.try_decimals();
    if(!toTokenDecimalsResult.reverted) {
        toToken.decimals = toTokenDecimalsResult.value;
    }
    swap.fromToken = event.params._fromToken.toHex();
    swap.toToken = event.params._toToken.toHex();
    swap.converterUsed = event.address.toHex();
    swap.amountPurchased = event.params._amount;
    swap.amountReturned = event.params._return;
    swap.conversionFee = event.params._conversionFee;
    swap.trader = event.params._trader.toHex();
    swap.transaction = event.transaction.hash.toHex();
    swap.logIndex = event.logIndex.toI32();
    transaction.blockNumber = event.block.number;
    transaction.blockTimestamp = event.block.timestamp;
    transaction.gasUsed = event.transaction.gasUsed;
    transaction.gasPrice = event.transaction.gasPrice;
    trader.numSwaps = trader.numSwaps.plus(BigInt.fromI32(1));
    let userTokenSwapId = event.params._trader.toHex() + "-" + event.params._fromToken.toHex() + "-" + event.params._toToken.toHex();
    let userTokenSwapTotal = UserTokenSwapTotal.load(userTokenSwapId);
    if(userTokenSwapTotal == null) {
        userTokenSwapTotal = new UserTokenSwapTotal(userTokenSwapId);
        userTokenSwapTotal.user = event.params._trader.toHex();
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