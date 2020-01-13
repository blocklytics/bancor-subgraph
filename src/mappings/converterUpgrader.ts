import { BigInt, log } from "@graphprotocol/graph-ts"
import {
    ConverterUpgrade,
    UpgradeOldCall
} from "../../generated/ConverterUpgraderContract/ConverterUpgraderContract"
import {
    Converter,
    ConverterTokenBalance
} from "../../generated/schema"


// Converter events
export function handleConverterUpgrade(event: ConverterUpgrade): void {
    let oldConverterAddress = event.params._oldConverter;
    let newConverterAddress = event.params._newConverter;

    let oldConverterEntity = Converter.load(oldConverterAddress.toHex());

    let newConverterEntity = Converter.load(newConverterAddress.toHex());
    if(newConverterEntity == null) {
        newConverterEntity = new Converter(newConverterAddress.toHex());
        newConverterEntity.smartToken = oldConverterEntity.smartToken;
        newConverterEntity.save();
    }
    let oldConverterTokenBalances = oldConverterEntity.tokenBalances;
    log.debug("Converter Upgrade fired: {} > {}, Old Converter Balances: {}", [oldConverterAddress.toHex(), newConverterAddress.toHex(), oldConverterTokenBalances.toString()]);
    for(var i = 0; i < oldConverterTokenBalances.length; i++) {
        let oldConverterTokenBalanceID = oldConverterTokenBalances[i];
        let oldConverterTokenBalanceEntity = new ConverterTokenBalance(oldConverterTokenBalanceID);
        let newConverterTokenBalanceID = newConverterAddress.toHex() + "-" + oldConverterTokenBalanceEntity.token;
        let newConverterTokenBalanceEntity = new ConverterTokenBalance(newConverterTokenBalanceID);
        newConverterTokenBalanceEntity.token = oldConverterTokenBalanceEntity.token;
        newConverterTokenBalanceEntity.converter = newConverterAddress.toHex();
        newConverterTokenBalanceEntity.balance = oldConverterTokenBalanceEntity.balance;
        oldConverterTokenBalanceEntity.balance = BigInt.fromI32(0);
        newConverterTokenBalanceEntity.save();
        oldConverterTokenBalanceEntity.save();
    }
}

export function handleUpgradeOld(call: UpgradeOldCall): void {
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