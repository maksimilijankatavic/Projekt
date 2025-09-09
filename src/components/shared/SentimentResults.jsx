import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

// Color scheme for sentiments
const SENTIMENT_COLORS = {
  positive: '#10b981', // green
  negative: '#ef4444', // red
  neutral: '#6b7280',  // gray
};

const CHART_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

// Helper function to get sentiment color
const getSentimentColor = (sentiment) => SENTIMENT_COLORS[sentiment] || '#6b7280';

// Helper function to format confidence scores
const formatScore = (score) => (score * 100).toFixed(1);

const SentimentResults = ({ data }) => {
  if (!data) return null;

  // Prepare data for comparison chart
  const comparisonData = [
    {
      model: 'VADER',
      positive: data.vader?.positive || 0,
      negative: data.vader?.negative || 0,
      neutral: data.vader?.neutral || 0,
      sentiment: data.vader?.sentiment || 'error'
    },
    {
      model: 'Naive Bayes',
      positive: data.naive_bayes?.positive || 0,
      negative: data.naive_bayes?.negative || 0,
      neutral: data.naive_bayes?.neutral || 0,
      sentiment: data.naive_bayes?.sentiment || 'error'
    },
    {
      model: 'RoBERTa',
      positive: data.roberta?.positive || 0,
      negative: data.roberta?.negative || 0,
      neutral: data.roberta?.neutral || 0,
      sentiment: data.roberta?.sentiment || 'error'
    }
  ];

  // Prepare data for final sentiment pie chart
  const finalSentimentData = [
    { name: 'Positive', value: data.conclusion?.positive?.length || 0, color: SENTIMENT_COLORS.positive },
    { name: 'Negative', value: data.conclusion?.negative?.length || 0, color: SENTIMENT_COLORS.negative },
    { name: 'Neutral', value: data.conclusion?.neutral?.length || 0, color: SENTIMENT_COLORS.neutral }
  ].filter(item => item.value > 0);

  // Prepare radar chart data for model comparison
  const radarData = [
    {
      sentiment: 'Positive',
      VADER: data.vader?.positive || 0,
      'Naive Bayes': data.naive_bayes?.positive || 0,
      RoBERTa: data.roberta?.positive || 0,
    },
    {
      sentiment: 'Negative',
      VADER: data.vader?.negative || 0,
      'Naive Bayes': data.naive_bayes?.negative || 0,
      RoBERTa: data.roberta?.negative || 0,
    },
    {
      sentiment: 'Neutral',
      VADER: data.vader?.neutral || 0,
      'Naive Bayes': data.naive_bayes?.neutral || 0,
      RoBERTa: data.roberta?.neutral || 0,
    }
  ];

  return (
    <div className="space-y-6">
      {/* Final Result Card */}
      <Card className="border-2" style={{ borderColor: getSentimentColor(data.conclusion?.final_sentiment) }}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            Final Sentiment Analysis
            <Badge 
              className="text-white font-semibold"
              style={{ backgroundColor: getSentimentColor(data.conclusion?.final_sentiment) }}
            >
              {data.conclusion?.final_sentiment?.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Consensus from {comparisonData.filter(m => m.sentiment !== 'error').length} models
          </CardDescription>
        </CardHeader>
        <CardContent>
          {finalSentimentData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalSentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {finalSentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} models`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
          <CardDescription>Confidence scores across all three models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Tooltip 
                  formatter={(value, name) => [`${formatScore(value)}%`, name.charAt(0).toUpperCase() + name.slice(1)]}
                />
                <Bar dataKey="positive" fill={SENTIMENT_COLORS.positive} name="positive" />
                <Bar dataKey="negative" fill={SENTIMENT_COLORS.negative} name="negative" />
                <Bar dataKey="neutral" fill={SENTIMENT_COLORS.neutral} name="neutral" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Model Performance Radar</CardTitle>
          <CardDescription>Comparative view of all models across sentiment categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="sentiment" />
                <PolarRadiusAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Radar name="VADER" dataKey="VADER" stroke="#f97316" fill="#f97316" fillOpacity={0.1} />
                <Radar name="Naive Bayes" dataKey="Naive Bayes" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Radar name="RoBERTa" dataKey="RoBERTa" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
                <Tooltip formatter={(value) => `${formatScore(value)}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Individual Model Details */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* VADER */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              VADER
              {data.vader?.sentiment && (
                <Badge style={{ backgroundColor: getSentimentColor(data.vader.sentiment) }} className="text-white">
                  {data.vader.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Rule-based sentiment analyzer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.vader?.error ? (
              <p className="text-red-500">Error: {data.vader.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-green-500">Positive:</span>
                  <span>{formatScore(data.vader?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-500">Negative:</span>
                  <span>{formatScore(data.vader?.negative || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Neutral:</span>
                  <span>{formatScore(data.vader?.neutral || 0)}%</span>
                </div>
                {data.vader?.compound !== undefined && (
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">Compound:</span>
                    <span className={data.vader.compound >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {data.vader.compound.toFixed(3)}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Naive Bayes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Naive Bayes
              {data.naive_bayes?.sentiment && (
                <Badge style={{ backgroundColor: getSentimentColor(data.naive_bayes.sentiment) }} className="text-white">
                  {data.naive_bayes.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Machine learning classifier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.naive_bayes?.error ? (
              <p className="text-red-500">Error: {data.naive_bayes.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-green-500">Positive:</span>
                  <span>{formatScore(data.naive_bayes?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-500">Negative:</span>
                  <span>{formatScore(data.naive_bayes?.negative || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Neutral:</span>
                  <span>{formatScore(data.naive_bayes?.neutral || 0)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* RoBERTa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              RoBERTa
              {data.roberta?.sentiment && (
                <Badge style={{ backgroundColor: getSentimentColor(data.roberta.sentiment) }} className="text-white">
                  {data.roberta.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Transformer-based model</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.roberta?.error ? (
              <p className="text-red-500">Error: {data.roberta.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-green-500">Positive:</span>
                  <span>{formatScore(data.roberta?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-500">Negative:</span>
                  <span>{formatScore(data.roberta?.negative || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Neutral:</span>
                  <span>{formatScore(data.roberta?.neutral || 0)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Agreement Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Model Agreement Analysis</CardTitle>
          <CardDescription>How the models voted on sentiment classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${SENTIMENT_COLORS.positive}10` }}>
              <div className="text-2xl font-bold" style={{ color: SENTIMENT_COLORS.positive }}>
                {data.conclusion?.positive?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Positive</div>
              {data.conclusion?.positive?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.positive.map((model, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${SENTIMENT_COLORS.negative}10` }}>
              <div className="text-2xl font-bold" style={{ color: SENTIMENT_COLORS.negative }}>
                {data.conclusion?.negative?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Negative</div>
              {data.conclusion?.negative?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.negative.map((model, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: `${SENTIMENT_COLORS.neutral}10` }}>
              <div className="text-2xl font-bold" style={{ color: SENTIMENT_COLORS.neutral }}>
                {data.conclusion?.neutral?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Neutral</div>
              {data.conclusion?.neutral?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.neutral.map((model, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SentimentResults;