import { Address } from "@graphprotocol/graph-ts";

import { OwnerUpdate } from "../../generated/CrowdsaleContract/CrowdsaleContract";

import {
  SmartTokenContract as SmartTokenTemplate,
  ConverterContract as ConverterTemplate
} from "../../generated/templates";

import { Converter, Token } from "../../generated/schema";

import { converterBackfill, smartTokenBackfill } from "./backfill";

export function createBackfill(event: OwnerUpdate): void {
  for (let i = 0; i < converterBackfill.length; i++) {
    let converterAddress = converterBackfill[i];
    ConverterTemplate.create(Address.fromString(converterAddress));
    let converterEntity = new Converter(converterAddress);
    converterEntity.save();
  }

  for (let j = 0; j < smartTokenBackfill.length; j++) {
    let smartTokenAddress = smartTokenBackfill[j];
    SmartTokenTemplate.create(Address.fromString(smartTokenAddress));
    let smartTokenEntity = new Token(smartTokenAddress);
    smartTokenEntity.save();
  }
}
