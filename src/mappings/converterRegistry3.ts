import {
    BigInt,
    log
} from "@graphprotocol/graph-ts"
import {
    SmartTokenAdded,
    SmartTokenRemoved,
    LiquidityPoolAdded,
    LiquidityPoolRemoved,
    ConvertibleTokenAdded,
    ConvertibleTokenRemoved,
    OwnerUpdate as ConverterRegistryOwnerUpdate
} from "../../generated/ConverterRegistryContract3/ConverterRegistryContract"
import {
    ConverterContract
} from "../../generated/ConverterRegistryContract3/ConverterContract"
import {
    SmartTokenContract
} from "../../generated/ConverterRegistryContract3/SmartTokenContract"
import {
    ERC20Contract
} from "../../generated/ConverterRegistryContract3/ERC20Contract"
import {
    SmartTokenContract as SmartTokenTemplate,
    ConverterContract as ConverterTemplate
} from "../../generated/templates"
import {
    ConverterRegistry,
    Converter,
    Token,
    QuickBuyPathMember,
    Connector
} from "../../generated/schema"

// Converter Registry events
export function handleSmartTokenAdded(event: SmartTokenAdded): void {
    let smartTokenAddress = event.params._smartToken;
    log.debug("Smart Token added to registry: {}", [smartTokenAddress.toHex()])
    SmartTokenTemplate.create(smartTokenAddress);
    let smartTokenContract = SmartTokenContract.bind(smartTokenAddress);
    let converterAddress = smartTokenContract.owner();
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
    let smartTokenEntity = new Token(smartTokenAddress.toHex());
    smartTokenEntity.addedToRegistryBlockNumber = event.block.number;
    // smartTokenEntity.addedToRegistryTransactionHash = event.transaction.hash.toHex();
    smartTokenEntity.isSmartToken = true;

    let converterConnectorTokenCountResult = converterContract.try_connectorTokenCount();
    let converterConnectorTokens = converterEntity.connectorTokens as Array<string> || [] as Array<string>;
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

                    let connectorTokenNameResult = connectorTokenContract.try_name();
                    if (!connectorTokenNameResult.reverted) {
                        connectorTokenEntity.name = connectorTokenNameResult.value;
                    }
                    let connectorTokenSymbolResult = connectorTokenContract.try_symbol();
                    if (!connectorTokenSymbolResult.reverted) {
                        connectorTokenEntity.symbol = connectorTokenSymbolResult.value;
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
                    if(!converterConnectorsResult.reverted) {
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
    let smartTokenNameResult = smartTokenContract.try_name();
    if (!smartTokenNameResult.reverted) {
        smartTokenEntity.name = smartTokenNameResult.value;
    }
    let smartTokenSymbolResult = smartTokenContract.try_symbol();
    if (!smartTokenSymbolResult.reverted) {
        smartTokenEntity.symbol = smartTokenSymbolResult.value;
    }
    let smartTokenDecimalsResult = smartTokenContract.try_decimals();
    if (!smartTokenDecimalsResult.reverted) {
        smartTokenEntity.decimals = smartTokenDecimalsResult.value;
    }

    let smartTokenConverters = smartTokenEntity.converters as Array<string>|| [] as Array<string>;
    if(smartTokenConverters.length == 0) {
        smartTokenConverters.push(converterAddress.toHex());
    } else if(!smartTokenConverters.includes(converterAddress.toHex())) {
        smartTokenConverters.push(converterAddress.toHex());
    }
    log.debug("Smart Token Converters: {}", [smartTokenConverters.toString()])
    smartTokenEntity.converters = smartTokenConverters; 
    smartTokenEntity.currentRegistry = event.address.toHex();
    let smartTokenVersionResult = smartTokenContract.try_version();
    if (!smartTokenVersionResult.reverted) {
        smartTokenEntity.version = smartTokenVersionResult.value;
    }
    let smartTokenStandardResult = smartTokenContract.try_standard();
    if (!smartTokenStandardResult.reverted) {
        smartTokenEntity.standard = smartTokenStandardResult.value;
    }
    let smartTokenTransfersEnabledResult = smartTokenContract.try_transfersEnabled();
    if (!smartTokenTransfersEnabledResult.reverted) {
        smartTokenEntity.transfersEnabled = smartTokenTransfersEnabledResult.value;
    }
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

    let converterRegistryEntity = ConverterRegistry.load(event.address.toHex());
    if (converterRegistryEntity == null) {
        converterRegistryEntity = new ConverterRegistry(event.address.toHex());
    }
    let converterRegistryConverters = converterRegistryEntity.converters || [];
    if(converterRegistryConverters.length == 0) {
        converterRegistryConverters.push(converterAddress.toHex());
    } else if(!converterRegistryConverters.includes(converterAddress.toHex())) {
        converterRegistryConverters.push(converterAddress.toHex());
    }
    log.debug("Converter Registry Converters: {}", [converterRegistryConverters.toString()]);
    converterRegistryEntity.converters = converterRegistryConverters;
    let converterRegistrySmartTokens = converterRegistryEntity.smartTokens || [];
    if(converterRegistrySmartTokens.length == 0) {
        converterRegistrySmartTokens.push(smartTokenAddress.toHex());
    } else if(!converterRegistrySmartTokens.includes(smartTokenAddress.toHex())) {
        converterRegistrySmartTokens.push(smartTokenAddress.toHex());
    }
    log.debug("Converter Registry Smart Tokens: {}", [converterRegistrySmartTokens.toString()]);
    converterRegistryEntity.smartTokens = converterRegistrySmartTokens;
    let converterRegistryConnectorTokens = converterRegistryEntity.connectorTokens || [];
    for(var i = 0; i < converterConnectorTokens.length; i++) {
        if(!converterRegistryConnectorTokens.includes(converterConnectorTokens[i])) {
            converterRegistryConnectorTokens.push(converterConnectorTokens[i]);
        }
    }
    log.debug("Converter Registry Connector Tokens: {}", [converterRegistryConnectorTokens.toString()]);
    converterRegistryEntity.connectorTokens = converterRegistryConnectorTokens;
    converterRegistryEntity.save();
    smartTokenEntity.save();
    converterEntity.save();
}

export function handleSmartTokenRemoved(event: SmartTokenRemoved): void {
    log.debug("Smart Token removed from registry: {}", [event.params._smartToken.toHex()]);
    let converterRegistryEntity = ConverterRegistry.load(event.address.toHex());
    if (converterRegistryEntity == null) {
        converterRegistryEntity = new ConverterRegistry(event.address.toHex());
    }
    let convertersRegistered = converterRegistryEntity.converters || [];
    let smartTokensRegistered = converterRegistryEntity.smartTokens || [];
    let smartTokenIndex = smartTokensRegistered.indexOf(event.params._smartToken.toHex(), 0);
    if (smartTokenIndex > -1) {
        smartTokensRegistered.splice(smartTokenIndex, 1);
    }
    converterRegistryEntity.smartTokens = smartTokensRegistered;
    let smartTokenEntity = Token.load(event.params._smartToken.toHex());
    let smartTokenConverters = smartTokenEntity.converters as Array<string>;
    for(var i = 0; i < smartTokenConverters.length; i++) {
        let converterIndex = convertersRegistered.indexOf(smartTokenConverters[i], 0);
        if (converterIndex > -1) {
            convertersRegistered.splice(converterIndex, 1);
        }
    } 
    converterRegistryEntity.converters = convertersRegistered;
    converterRegistryEntity.save();
}

export function handleLiquidityPoolAdded(event: LiquidityPoolAdded): void {

}

export function handleLiquidityPoolRemoved(event: LiquidityPoolRemoved): void {

}

export function handleConvertibleTokenAdded(event: ConvertibleTokenAdded): void {
}

export function handleConvertibleTokenRemoved(event: ConvertibleTokenRemoved): void {
    let converterRegistryEntity = ConverterRegistry.load(event.address.toHex());
    if (converterRegistryEntity == null) {
        converterRegistryEntity = new ConverterRegistry(event.address.toHex());
    }
    let connectorTokensRegistered = converterRegistryEntity.connectorTokens || [];
    let connectorTokenIndex = connectorTokensRegistered.indexOf(event.params._convertibleToken.toHex(), 0);
    if (connectorTokenIndex > -1) {
        connectorTokensRegistered.splice(connectorTokenIndex, 1);
    }
    converterRegistryEntity.connectorTokens = connectorTokensRegistered;
    converterRegistryEntity.save();
}

export function handleConverterRegistryOwnerUpdate(event: ConverterRegistryOwnerUpdate): void {
    let converterRegistryEntity = new ConverterRegistry(event.address.toHex());
    converterRegistryEntity.owner = event.params._newOwner.toHex();
    converterRegistryEntity.save();
}