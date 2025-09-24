import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, Rectangle, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type StartedAndCompletedDataCategorized = {
    category: string;
    started: number;
    completed: number;
}[];

type StartedAndCompletedByAttributeProps = {
    attributeName: string;
    direction?: 'horizontal' | 'vertical';
};

// Return configured axis for horizontal or vertical direction
const ChartAxisAndLegend: React.FC<{ direction: 'horizontal' | 'vertical' }> = ({ direction }) => {
    if (direction === 'vertical') {
        return (
            <React.Fragment>
                <XAxis
                    type="category"
                    dataKey="category"
                    height={60} // Increase height for rotated labels
                    tickFormatter={(value) => value}
                    angle={-45} // Rotate labels diagonally
                    textAnchor="end" // Align text properly
                    interval={0} // Show all labels
                />
                <YAxis />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }} />
            </React.Fragment>
        );
    } else {
        return (
            <React.Fragment>
                <XAxis type="number" />
                <YAxis type="category" dataKey="category" />
                <Legend verticalAlign="bottom" />
            </React.Fragment>
        );
    }
};

/**
 * Generic component to show a bar chart of started and completed interviews by
 * a given attribute
 *
 * @param attributeName the attribute by which to make the graph
 * @returns A component with a bar chart for completed and started interview by
 * the given attribute
 */
const StartedAndCompletedByAttribute: React.FC<StartedAndCompletedByAttributeProps> = ({
    attributeName,
    direction = 'vertical'
}: StartedAndCompletedByAttributeProps) => {
    const { t } = useTranslation();

    const [data, setData] = useState<StartedAndCompletedDataCategorized>([]);

    useEffect(() => {
        fetch('/api/admin/data/startedCompletedByAttribute?attribute=' + encodeURIComponent(attributeName), {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then((response) => {
                // TODO Handle errors better, currently, the graph is simply
                // absent from the status page (returns null)
                if (response.status === 200) {
                    response
                        .json()
                        .then((jsonData) => {
                            const dataForChart: StartedAndCompletedDataCategorized = [];
                            const sortedCategories = Object.keys(jsonData.started).sort();
                            for (let i = 0, count = sortedCategories.length; i < count; i++) {
                                const category = sortedCategories[i];
                                const completedCount = jsonData.completed[category] || 0;
                                const completedRatio = completedCount / jsonData.started[category];
                                // Translation strings can be added in the surveyAdmin.yml translation file with the key pattern: {attributeName}Categories: under which are the categories
                                const translatedCategory = t(`surveyAdmin:${attributeName}Categories:${category}`, {
                                    defaultValue: category
                                });
                                dataForChart.push({
                                    category: `${translatedCategory} (${Math.round(completedRatio * 1000) / 10})%`,
                                    started: jsonData.started[category],
                                    completed: completedCount
                                });
                            }
                            setData(dataForChart);
                        })
                        .catch((err) => {
                            console.log('Error converting data to json.', err);
                        });
                }
            })
            .catch((err) => {
                console.log('Error fetching data.', err);
            });
    }, []);

    // FIXME Maybe we should still return a placeholder to show there is no data
    if (data.length === 0) {
        return null;
    }

    // Either constraint the width or height depending on the direction, to show
    // all data
    // FIXME Improve style when moving the Evolution. The horizontal chart takes
    // full width of page, it should be bounded to something, but what?
    const constrainedSize = Math.min(1600, Math.max(250, data.length * 30 + 150));
    const divStyle =
        direction === 'vertical'
            ? { width: `${constrainedSize}px`, height: '100%' }
            : { height: `${constrainedSize}px`, width: '100%' };

    return (
        <div className="admin-widget-container" style={divStyle}>
            <p className="no-bottom-margin">
                <strong>
                    {t('surveyAdmin:StartedAndCompletedInterviewsPer', {
                        attribute: t(`surveyAdmin:${attributeName}`, { defaultValue: attributeName })
                    })}
                </strong>
            </p>
            {/* Adjust height to make room for title and download link*/}
            <ResponsiveContainer width="100%" height="85%">
                <BarChart
                    layout={direction === 'vertical' ? 'horizontal' : 'vertical'} // To have horizontal bar charts, layout has to be vertical
                    width={500}
                    height={300}
                    data={data}
                    margin={{
                        top: 20, // Increased top margin to make room for the title
                        right: 30,
                        left: 20,
                        bottom: 70
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <ChartAxisAndLegend direction={direction} />
                    <Tooltip />
                    <Bar
                        dataKey="started"
                        name={t('admin:StartedFem')}
                        fill="#A4DB4F"
                        activeBar={<Rectangle stroke="blue" />}
                    />
                    <Bar
                        dataKey="completed"
                        name={t('admin:CompletedFem')}
                        fill="#428626"
                        activeBar={<Rectangle stroke="blue" />}
                    />
                </BarChart>
            </ResponsiveContainer>
            <a href={`/api/admin/data/startedCompletedByAttributeCsv?attribute=${encodeURIComponent(attributeName)}`}>
                {t('surveyAdmin:CSV')}
            </a>
        </div>
    );
};

export default StartedAndCompletedByAttribute;
