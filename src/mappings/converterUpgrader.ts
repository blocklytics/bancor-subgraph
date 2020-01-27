import { BigInt, log, SmartContract } from "@graphprotocol/graph-ts"
import {
    ConverterUpgrade,
    UpgradeOldCall
} from "../../generated/ConverterUpgraderContract/ConverterUpgraderContract"
import {
    ConverterContract
} from "../../generated/ConverterUpgraderContract/ConverterContract"
import {
    ERC20Contract
} from "../../generated/ConverterUpgraderContract/ERC20Contract"
import {
    Converter,
    ConverterTokenBalance
} from "../../generated/schema"


// Converter events
export function handleConverterUpgrade(event: ConverterUpgrade): void {
    let oldConverterAddress = event.params._oldConverter;
    let newConverterAddress = event.params._newConverter;
    let oldConverterContract = ConverterContract.bind(oldConverterAddress);


    let oldConverterEntity = Converter.load(oldConverterAddress.toHex());
    if(oldConverterEntity == null) {
        oldConverterEntity = new Converter(newConverterAddress.toHex());
    }
    
    let newConverterEntity = Converter.load(newConverterAddress.toHex());
    if(newConverterEntity == null) {
        newConverterEntity = new Converter(newConverterAddress.toHex());
        newConverterEntity.smartToken = oldConverterEntity.smartToken;
        newConverterEntity.save();
    }
    let converterSmartTokenResult = oldConverterContract.try_token();
    if(!converterSmartTokenResult.reverted) {
        let converterSmartTokenAddress = converterSmartTokenResult.value;
        let oldConverterTokenBalanceID = oldConverterAddress.toHex() + "-" + converterSmartTokenAddress.toHex();
        let oldConverterTokenBalanceEntity = new ConverterTokenBalance(oldConverterTokenBalanceID);
        oldConverterTokenBalanceEntity.balance = BigInt.fromI32(0);
        oldConverterTokenBalanceEntity.save();
    }
    let connectorCountResult = oldConverterContract.try_connectorTokenCount();
    if (!connectorCountResult.reverted) {
        let connectorCount = connectorCountResult.value;
        for(var i = 0; i < connectorCount; i++) {
            let tokenAddress = oldConverterContract.connectorTokens(BigInt.fromI32(i));
            let oldConverterTokenBalanceID = oldConverterAddress.toHex() + "-" + tokenAddress.toHex();
            let oldConverterTokenBalanceEntity = ConverterTokenBalance.load(oldConverterTokenBalanceID);
            if(oldConverterTokenBalanceEntity == null) {
                oldConverterTokenBalanceEntity = new ConverterTokenBalance(oldConverterTokenBalanceID);
            }
            let newConverterTokenBalanceID = newConverterAddress.toHex() + "-" + tokenAddress.toHex();
            let newConverterTokenBalanceEntity = new ConverterTokenBalance(newConverterTokenBalanceID);
            newConverterTokenBalanceEntity.token = tokenAddress.toHex();
            newConverterTokenBalanceEntity.converter = newConverterAddress.toHex();
            let tokenContract = ERC20Contract.bind(tokenAddress);
            oldConverterTokenBalanceEntity.balance = tokenContract.balanceOf(oldConverterAddress);
            newConverterTokenBalanceEntity.balance = tokenContract.balanceOf(newConverterAddress);
            newConverterTokenBalanceEntity.save();
            oldConverterTokenBalanceEntity.save();
        }
    } else {
        log.debug("Converter connector count not available for Converter: {} on Converter Upgrade call at transaction {}", [oldConverterAddress.toHex(), newConverterAddress.toHex(), event.transaction.hash.toHex()]);
    }
    oldConverterEntity.lastResetBlockNumber = event.block.number;
    oldConverterEntity.lastResetTimestamp = event.block.timestamp;
    oldConverterEntity.save();
    // let oldConverterTokenBalances = oldConverterEntity.tokenBalances as string[];
    // log.debug("Converter Upgrade fired: {} > {}, Old Converter Balances: {}", [oldConverterAddress.toHex(), newConverterAddress.toHex(), oldConverterTokenBalances.toString()]);
    // for(var i = 0; i < oldConverterTokenBalances.length; i++) {
    //     let oldConverterTokenBalanceID = oldConverterTokenBalances[i];
    //     log.debug("Loading Converter balances ({}): {}", [oldConverterAddress.toHex(), oldConverterTokenBalanceID]);
    //     let oldConverterTokenBalanceEntity = new ConverterTokenBalance(oldConverterTokenBalanceID);
    //     let newConverterTokenBalanceID = newConverterAddress.toHex() + "-" + oldConverterTokenBalanceEntity.token;
    //     let newConverterTokenBalanceEntity = new ConverterTokenBalance(newConverterTokenBalanceID);
    //     newConverterTokenBalanceEntity.token = oldConverterTokenBalanceEntity.token;
    //     newConverterTokenBalanceEntity.converter = newConverterAddress.toHex();
    //     newConverterTokenBalanceEntity.balance = oldConverterTokenBalanceEntity.balance;
    //     oldConverterTokenBalanceEntity.balance = BigInt.fromI32(0);
    //     newConverterTokenBalanceEntity.save();
    //     oldConverterTokenBalanceEntity.save();
    // }
}

export function handleUpgradeOld(call: UpgradeOldCall): void {
    log.debug("Upgrade Old event fired for Converter {} at transaction {}", [call.inputs._converter.toHex(), call.transaction.hash.toHex()]);
    let converterAddress = call.inputs._converter;
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