/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AddressAttributes } from 'evolution-common/lib/services/baseObjects/Address';
import { SurveyObjectParser } from 'evolution-backend/lib/services/audits/types';
import { CorrectedResponse } from 'evolution-common/lib/services/questionnaire/types';
import { ExtendedPlaceAttributes } from 'evolution-common/lib/services/baseObjects/Place';
import _cloneDeep from 'lodash/cloneDeep';

/**
 * @param originalCorrectedHomeAttributes - The home attributes to parse
 * @param correctedResponse - The corrected response
 */
export const parseHomeAttributes: SurveyObjectParser<ExtendedPlaceAttributes, CorrectedResponse> = (
    originalCorrectedHomeAttributes: Readonly<ExtendedPlaceAttributes>,
    _correctedResponse?: Readonly<CorrectedResponse>
): ExtendedPlaceAttributes => {
    const homeAttributes = _cloneDeep(originalCorrectedHomeAttributes) as ExtendedPlaceAttributes;

    if (!homeAttributes || typeof homeAttributes !== 'object') {
        return homeAttributes;
    }

    // Check if we have address-related fields to convert
    const hasAddressFields =
        homeAttributes.address ||
        homeAttributes.city ||
        homeAttributes.region ||
        homeAttributes.country ||
        homeAttributes.postalCode;

    if (!hasAddressFields) {
        return homeAttributes;
    }

    // Create address object from flat fields
    const addressData: AddressAttributes = {};

    // Map flat address fields to Address object structure
    if (homeAttributes.address) {
        // For now, put the full address string in streetName
        // In a more sophisticated parser, you might parse civic number, street name, etc.
        addressData.fullAddress = homeAttributes.address as string;
    }

    if (homeAttributes.city) {
        addressData.municipalityName = homeAttributes.city as string;
    }

    if (homeAttributes.region) {
        addressData.region = homeAttributes.region as string;
    }

    if (homeAttributes.country) {
        addressData.country = homeAttributes.country as string;
    }

    if (homeAttributes.postalCode) {
        addressData.postalCode = homeAttributes.postalCode as string;
    }

    // Only create address object if we have meaningful address data
    // Require at least fullAddress OR municipalityName to create an address object
    if (addressData.fullAddress || addressData.municipalityName) {
        // Clean up the flat fields first
        delete homeAttributes.address;
        delete homeAttributes.city;
        delete homeAttributes.region;
        delete homeAttributes.country;
        delete homeAttributes.postalCode;

        // Set the address object with the structured data
        homeAttributes.address = addressData;
        return homeAttributes;
    }
    return homeAttributes;
};
