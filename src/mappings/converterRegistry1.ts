import {
    BigInt,
    log
} from "@graphprotocol/graph-ts"
import {
    TokenAddition,
    TokenRemoval,
    ConverterAddition,
    ConverterRemoval,
    OwnerUpdate as ConverterRegistryOwnerUpdate
} from "../../generated/ConverterRegistryContract1/ConverterRegistryContract"
import {
    ConverterContract
} from "../../generated/ConverterRegistryContract1/ConverterContract"
import {
    SmartTokenContract
} from "../../generated/ConverterRegistryContract1/SmartTokenContract"
import {
    ERC20Contract
} from "../../generated/ConverterRegistryContract1/ERC20Contract"
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
export function handleTokenAddition(event: TokenAddition): void {}

export function handleTokenRemoval(event: TokenRemoval): void {}

export function handleConverterAddition(event: ConverterAddition): void {
    log.debug("Converter added to registry: {}, Token: {}", [event.params._address.toHex(), event.params._token.toHex()]);
    let converterAddress = event.params._address;
    let converterEntity = Converter.load(converterAddress.toHex());

    if (converterEntity == null) {
        ConverterTemplate.create(event.params._address);
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

    let smartTokenConnectorTokens = smartTokenEntity.connectorTokens || [];
    smartTokenConnectorTokens.push(connectorTokenAddress.toHex());
    log.debug("Smart Token Connector Tokens: {}", [smartTokenConnectorTokens.toString()])
    smartTokenEntity.connectorTokens = smartTokenConnectorTokens;
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

    let smartTokenConverters = smartTokenEntity.converters || [];
    smartTokenConverters.push(converterAddress.toHex());
    log.debug("Smart Token Converters: {}", [smartTokenConverters.toString()])
    smartTokenEntity.converters = smartTokenConverters;
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

    let converterConnectorTokenCountResult = converterContract.try_connectorTokenCount();
    let converterConnectorTokens = converterEntity.connectorTokens || [];
    if (!converterConnectorTokenCountResult.reverted) {
        if (converterConnectorTokens.length != converterConnectorTokenCountResult.value) {
            let numConnectorTokens = converterConnectorTokenCountResult.value;
            converterConnectorTokens = [];
            for (let i = 0; i < numConnectorTokens; i++) {
                let connectorTokenResult = converterContract.try_connectorTokens(BigInt.fromI32(i));
                if (!connectorTokenResult.reverted) {
                    let connectorTokenAddress = connectorTokenResult.value;
                    converterConnectorTokens.push(connectorTokenAddress.toHex());
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