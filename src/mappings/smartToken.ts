import {
    BigInt,
    log
} from "@graphprotocol/graph-ts"
import {
    SmartTokenContract,
    Transfer,
    OwnerUpdate as SmartTokenOwnerUpdate
} from "../../generated/templates/SmartTokenContract/SmartTokenContract"
import {
    ConverterContract
} from "../../generated/templates/SmartTokenContract/ConverterContract"
import {
    ConverterContract as ConverterTemplate
} from "../../generated/templates"
import {
    ERC20Contract
} from "../../generated/templates/SmartTokenContract/ERC20Contract"
import {
    ConverterRegistry,
    Converter,
    Token,
    User,
    UserSmartTokenBalance,
    QuickBuyPathMember,
    Connector
} from "../../generated/schema"

export function handleTransfer(event: Transfer): void {
    log.debug("Smart Token Transfer event fired - {}: {} > {}", [event.address.toHex(), event.params._from.toHex(), event.params._to.toHex()])
    let smartTokenAddress = event.address;
    let smartTokenEntity = Token.load(smartTokenAddress.toHex());
    if (smartTokenEntity == null) {
        smartTokenEntity = new Token(smartTokenAddress.toHex());
    }
    let amountTransferred = event.params._value;
    let fromAddress = event.params._from;
    let toAddress = event.params._to;
    let smartTokenContract = SmartTokenContract.bind(smartTokenAddress);
    let fromUser = User.load(fromAddress.toHex());
    if (fromUser == null) {
        fromUser = new User(fromAddress.toHex());
    }
    let fromUserSmartTokenBalanceID = fromAddress.toHex() + "-" + smartTokenAddress.toHex();
    let fromUserSmartTokenBalance = UserSmartTokenBalance.load(fromUserSmartTokenBalanceID);
    if (fromUserSmartTokenBalance == null) {
        fromUserSmartTokenBalance = new UserSmartTokenBalance(fromUserSmartTokenBalanceID);
    }
    fromUserSmartTokenBalance.user = fromAddress.toHex();
    fromUserSmartTokenBalance.smartToken = smartTokenAddress.toHex();
    let fromBalance = smartTokenContract.balanceOf(fromAddress);
    fromUserSmartTokenBalance.balance = fromBalance;
    // fromUserSmartTokenBalance.balance = balance.minus(amountTransferred);
    if (fromUserSmartTokenBalance.balance < BigInt.fromI32(0)) {
        log.debug("Negative Balance! Transaction: {}, From User: {}, To User: {}, Smart Token: {}", [event.transaction.hash.toHex(), fromAddress.toHex(), toAddress.toHex(), smartTokenAddress.toHex()])
    }
    fromUserSmartTokenBalance.save();
    fromUser.save();

    let toUser = User.load(toAddress.toHex());
    if (toUser == null) {
        toUser = new User(toAddress.toHex());
    }
    let toUserSmartTokenBalanceID = toAddress.toHex() + "-" + smartTokenAddress.toHex();
    let toUserSmartTokenBalance = UserSmartTokenBalance.load(toUserSmartTokenBalanceID);
    if (toUserSmartTokenBalance == null) {
        toUserSmartTokenBalance = new UserSmartTokenBalance(toUserSmartTokenBalanceID);
    }
    toUserSmartTokenBalance.user = toAddress.toHex();
    toUserSmartTokenBalance.smartToken = smartTokenAddress.toHex();
    let toBalance = smartTokenContract.balanceOf(toAddress);
    toUserSmartTokenBalance.balance = toBalance;
    if (toUserSmartTokenBalance.balance < BigInt.fromI32(0)) {
        log.debug("Negative Balance! Transaction: {}, From User: {}, To User: {}, Smart Token: {}", [event.transaction.hash.toHex(), fromAddress.toHex(), toAddress.toHex(), smartTokenAddress.toHex()])
    }
    toUserSmartTokenBalance.save();
    toUser.save();
}

// export function handleApproval(event: Approval): void {}

export function handleSmartTokenOwnerUpdate(event: SmartTokenOwnerUpdate): void {
    let smartTokenAddress = event.address;
    let smartTokenEntity = new Token(smartTokenAddress.toHex());
    let converterAddress = event.params._newOwner;
    smartTokenEntity.owner = converterAddress.toHex();
    let converterEntity = Converter.load(converterAddress.toHex());

    if (converterEntity == null) {
        ConverterTemplate.create(converterAddress);
        converterEntity = new Converter(converterAddress.toHex());
    }
    let converterContract = ConverterContract.bind(converterAddress);
    let converterQBPLength = 0;
    let converterQuickBuyPath = converterEntity.quickBuyPath || [];
    let converterQBPLengthResult = converterContract.try_getQuickBuyPathLength();
    if (!converterQBPLengthResult.reverted) {
        converterQBPLength = converterQBPLengthResult.value.toI32();
        if (converterQuickBuyPath.length == 0) {
            for (let i = 0; i < converterQBPLength; i++) {
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
    let converterConnectorTokenCountResult = converterContract.try_connectorTokenCount();
    let converterConnectorTokens = converterEntity.connectorTokens as Array < string > || [] as Array < string > ;
    if (!converterConnectorTokenCountResult.reverted) {
        if (converterConnectorTokens.length != converterConnectorTokenCountResult.value) {
            let numConnectorTokens = converterConnectorTokenCountResult.value;
            converterConnectorTokens = [];
            for (let i = 0; i < numConnectorTokens; i++) {
                let connectorTokenResult = converterContract.try_connectorTokens(BigInt.fromI32(i));
                if (!connectorTokenResult.reverted) {
                    let connectorTokenAddress = connectorTokenResult.value;
                    converterConnectorTokens.push(connectorTokenAddress.toHex());
                    let connectorTokenEntity = Token.load(connectorTokenAddress.toHex());
                    if (connectorTokenEntity == null) {
                        connectorTokenEntity = new Token(connectorTokenAddress.toHex());
                    }
                    let connectorTokenContract = ERC20Contract.bind(connectorTokenAddress);
                    if ((converterQBPLength != null && converterQBPLength != 0) && (connectorTokenEntity.shortestQuickBuyPath == null || converterQBPLength < connectorTokenEntity.shortestQuickBuyPath.length)) {
                        connectorTokenEntity.shortestQuickBuyPath = converterQuickBuyPath;
                        connectorTokenEntity.converterWithShortestQuickBuyPath = converterAddress.toHex();
                    }
                    connectorTokenEntity.isSmartToken = false;

                    if (connectorTokenAddress.toHex() == "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2") {
                        connectorTokenEntity.name = "Maker";
                        connectorTokenEntity.symbol = "MKR";
                    }
                    else if (connectorTokenAddress.toHex() == "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359") {
                        connectorTokenEntity.name = "Sai Stablecoin";
                        connectorTokenEntity.symbol = "SAI";
                    }
                    else if (connectorTokenAddress.toHex() == "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a") {
                        connectorTokenEntity.name = "DigixDAO";
                        connectorTokenEntity.symbol = "DGD";
                    }
                    else if (connectorTokenAddress.toHex() == "0xf1290473e210b2108a85237fbcd7b6eb42cc654f") {
                        connectorTokenEntity.name = "HedgeTrade";
                        connectorTokenEntity.symbol = "HEDG";
                    }
                    else {
                        let connectorTokenNameResult = connectorTokenContract.try_name();
                        if (!connectorTokenNameResult.reverted) {
                            connectorTokenEntity.name = connectorTokenNameResult.value;
                        }
                        let connectorTokenSymbolResult = connectorTokenContract.try_symbol();
                        if (!connectorTokenSymbolResult.reverted) {
                            connectorTokenEntity.symbol = connectorTokenSymbolResult.value;
                        }
                    }

                    let connectorTokenDecimalsResult = connectorTokenContract.try_decimals();
                    if (!connectorTokenDecimalsResult.reverted) {
                        connectorTokenEntity.decimals = connectorTokenDecimalsResult.value;
                    }
                    let connectorTokenConverters = connectorTokenEntity.converters || [];
                    connectorTokenConverters.push(converterAddress.toHex());
                    log.debug("Connector Token Converters: {}", [connectorTokenConverters.toString()])
                    connectorTokenEntity.converters = connectorTokenConverters;
                    connectorTokenEntity.save();
                    let converterConnectorsResult = converterContract.try_connectors(connectorTokenAddress);
                    if (!converterConnectorsResult.reverted) {
                        let connectorEntity = new Connector(converterAddress.toHex() + "-" + connectorTokenAddress.toHex());
                        connectorEntity.virtualBalance = converterConnectorsResult.value.value0;
                        connectorEntity.weight = converterConnectorsResult.value.value1;
                        connectorEntity.isVirtualBalanceEnabled = converterConnectorsResult.value.value2;
                        connectorEntity.isPurchaseEnabled = converterConnectorsResult.value.value3;
                        connectorEntity.isSet = converterConnectorsResult.value.value4;
                        connectorEntity.converter = converterAddress.toHex();
                        connectorEntity.connectorToken = connectorTokenAddress.toHex();
                        connectorEntity.save();
                    }
                }
            }
        }
        if (converterConnectorTokenCountResult.value == 2) {
            smartTokenEntity.smartTokenType = "Relay";
        } else {
            smartTokenEntity.smartTokenType = "Liquid";
        }
    }
    converterEntity.connectorTokens = converterConnectorTokens;
    smartTokenEntity.connectorTokens = converterConnectorTokens;
    let smartTokenConverters = smartTokenEntity.converters || [];
    if (smartTokenConverters.length == 0) {
        smartTokenConverters.push(converterAddress.toHex());
    } else if (!smartTokenConverters.includes(converterAddress.toHex())) {
        smartTokenConverters.push(converterAddress.toHex());
    }
    log.debug("Smart Token Converters: {}", [smartTokenConverters.toString()])
    smartTokenEntity.converters = smartTokenConverters;
    converterEntity.smartToken = smartTokenAddress.toHex();
    let converterVersionResult = converterContract.try_version();
    if (!converterVersionResult.reverted) {
        converterEntity.version = converterVersionResult.value;
    }
    let converterOwnerResult = converterContract.try_owner();
    if (!converterOwnerResult.reverted) {
        converterEntity.owner = converterOwnerResult.value.toHex();
    }
    let converterManagerResult = converterContract.try_manager();
    if (!converterManagerResult.reverted) {
        converterEntity.manager = converterManagerResult.value.toHex();
    }

    let converterMaxConversionFeeResult = converterContract.try_maxConversionFee();
    if (!converterMaxConversionFeeResult.reverted) {
        converterEntity.maxConversionFee = converterMaxConversionFeeResult.value;
    }
    let converterTypeResult = converterContract.try_converterType();
    if (!converterTypeResult.reverted) {
        converterEntity.type = converterTypeResult.value;
    }
    if (converterQBPLength != null && converterQBPLength > 0) {
        converterEntity.quickBuyPathLength = converterQBPLength;
        converterEntity.quickBuyPath = converterQuickBuyPath;
    }
    let converterRegistryAddress = smartTokenEntity.currentConverterRegistry;
    let converterRegistryEntity = ConverterRegistry.load(converterRegistryAddress);
    if (converterRegistryEntity == null) {
        converterRegistryEntity = new ConverterRegistry(converterRegistryAddress);
    }
    let converterRegistryConverters = converterRegistryEntity.converters || [];
    if (converterRegistryConverters.length == 0) {
        converterRegistryConverters.push(converterAddress.toHex());
    } else if (!converterRegistryConverters.includes(converterAddress.toHex())) {
        converterRegistryConverters.push(converterAddress.toHex());
    }
    log.debug("Converter Registry Converters: {}", [converterRegistryConverters.toString()]);
    converterRegistryEntity.converters = converterRegistryConverters;
    let converterRegistrySmartTokens = converterRegistryEntity.smartTokens || [];
    if (converterRegistrySmartTokens.length == 0) {
        converterRegistrySmartTokens.push(smartTokenAddress.toHex());
    } else if (!converterRegistrySmartTokens.includes(smartTokenAddress.toHex())) {
        converterRegistrySmartTokens.push(smartTokenAddress.toHex());
    }
    log.debug("Converter Registry Smart Tokens: {}", [converterRegistrySmartTokens.toString()]);
    converterRegistryEntity.smartTokens = converterRegistrySmartTokens;
    let converterRegistryConnectorTokens = converterRegistryEntity.connectorTokens as Array < string > || [] as Array < string > ;
    for (var i = 0; i < converterConnectorTokens.length; i++) {
        if (!converterRegistryConnectorTokens.includes(converterConnectorTokens[i])) {
            converterRegistryConnectorTokens.push(converterConnectorTokens[i]);
        }
    }
    log.debug("Converter Registry Connector Tokens: {}", [converterRegistryConnectorTokens.toString()]);
    converterRegistryEntity.connectorTokens = converterRegistryConnectorTokens;
    converterRegistryEntity.save();
    converterEntity.save();
    smartTokenEntity.save();
}