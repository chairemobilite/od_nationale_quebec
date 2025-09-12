import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

type LinkComponentProps = {
    title: string;
    fileName: string;
};

// Link component to download a CSV file.
const LinkComponent: React.FC<LinkComponentProps> = ({ title, fileName }) => {
    return (
        <li>
            <a href={`/api/admin/data/${fileName}`}>{title}</a>
        </li>
    );
};

// Component to display links to download CSV exports.
const CsvExports: React.FC<WithTranslation> = ({ t }) => {
    return (
        <div className="admin-widget-container">
            <ul>
                <LinkComponent title={t('surveyAdmin:downloadTrackingData')} fileName="downloadTrackingDataCSV" />
            </ul>
        </div>
    );
};

export default withTranslation()(CsvExports);
