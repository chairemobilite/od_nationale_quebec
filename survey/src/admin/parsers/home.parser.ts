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
 * Transforms flat home address fields into a nested Address object structure.
 * Converts address → fullAddress, city → municipalityName, and preserves region, country, postalCode.
 * Only creates the address object if at least fullAddress or municipalityName is present.
 *
 * @param originalCorrectedHomeAttributes - The home attributes to parse
 * @param correctedResponse - The corrected response
 * @returns ExtendedPlaceAttributes with nested address object if applicable
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

    const keys = Object.keys(homeAttributes);

    // Map flat address fields to Address object structure
    if (keys.includes('address')) {
        // For now, put the address string in address.fullAddress
        // TODO: In a more sophisticated parser, you might parse civic number, street name, etc.
        addressData.fullAddress =
            homeAttributes.address && homeAttributes.address !== '' ? String(homeAttributes.address) : undefined;
        delete homeAttributes.address;
    }

    if (keys.includes('city')) {
        addressData.municipalityName =
            homeAttributes.city && homeAttributes.city !== '' ? String(homeAttributes.city) : undefined;
        delete homeAttributes.city;
    }

    if (keys.includes('region')) {
        addressData.region =
            homeAttributes.region && homeAttributes.region !== '' ? String(homeAttributes.region) : undefined;
        delete homeAttributes.region;
    }

    if (keys.includes('country')) {
        addressData.country =
            homeAttributes.country && homeAttributes.country !== '' ? String(homeAttributes.country) : undefined;
        delete homeAttributes.country;
    }

    if (keys.includes('postalCode')) {
        addressData.postalCode =
            homeAttributes.postalCode && homeAttributes.postalCode !== ''
                ? String(homeAttributes.postalCode)
                : undefined;
        delete homeAttributes.postalCode;
    }

    // Set the address object with the structured data
    homeAttributes.address = addressData;

    return homeAttributes;
};
