import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Legend
} from 'recharts';

// Chart configuration - shadcn/ui style
const chartConfig = {
  positive: {
    label: "Positive",
    color: "hsl(142, 76%, 36%)", // emerald-600
  },
  neutral: {
    label: "Neutral", 
    color: "hsl(215, 20%, 65%)", // slate-400
  },
  negative: {
    label: "Negative",
    color: "hsl(0, 84%, 60%)", // red-500
  },
  vader: {
    label: "VADER",
    color: "hsl(24, 95%, 53%)", // orange-500
  },
  naive_bayes: {
    label: "Naive Bayes", 
    color: "hsl(221, 83%, 53%)", // blue-500
  },
  roberta: {
    label: "RoBERTa",
    color: "hsl(262, 83%, 58%)", // violet-500
  }
};

// Helper function to format confidence scores
const formatScore = (score) => (score * 100).toFixed(1);

// Helper function to get proper model names
const getModelDisplayName = (modelKey) => {
  const modelNames = {
    'vader': 'VADER',
    'naive_bayes': 'Naive Bayes', 
    'roberta': 'RoBERTa'
  };
  return modelNames[modelKey] || modelKey;
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {entry.name}: {typeof entry.value === 'number' ? formatScore(entry.value) : entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const SentimentResults = ({ data }) => {
  if (!data) return null;

  // Prepare data for comparison chart
  const comparisonData = [
    {
      model: 'VADER',
      positive: data.vader?.positive || 0,
      neutral: data.vader?.neutral || 0,
      negative: data.vader?.negative || 0,
      sentiment: data.vader?.sentiment || 'error'
    },
    {
      model: 'Naive Bayes',
      positive: data.naive_bayes?.positive || 0,
      neutral: data.naive_bayes?.neutral || 0, 
      negative: data.naive_bayes?.negative || 0,
      sentiment: data.naive_bayes?.sentiment || 'error'
    },
    {
      model: 'RoBERTa',
      positive: data.roberta?.positive || 0,
      neutral: data.roberta?.neutral || 0,
      negative: data.roberta?.negative || 0,
      sentiment: data.roberta?.sentiment || 'error'
    }
  ];

  // Prepare data for final sentiment pie chart
  const finalSentimentData = [
    { name: 'Positive', value: data.conclusion?.positive?.length || 0, fill: chartConfig.positive.color },
    { name: 'Neutral', value: data.conclusion?.neutral?.length || 0, fill: chartConfig.neutral.color },
    { name: 'Negative', value: data.conclusion?.negative?.length || 0, fill: chartConfig.negative.color }
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
      sentiment: 'Neutral',
      VADER: data.vader?.neutral || 0,
      'Naive Bayes': data.naive_bayes?.neutral || 0,
      RoBERTa: data.roberta?.neutral || 0,
    },
    {
      sentiment: 'Negative', 
      VADER: data.vader?.negative || 0,
      'Naive Bayes': data.naive_bayes?.negative || 0,
      RoBERTa: data.roberta?.negative || 0,
    }
  ];

  return (
    <div className="space-y-6">
      {/* Final Result Card */}
      <Card className="border-2" style={{ borderColor: chartConfig[data.conclusion?.final_sentiment]?.color || 'hsl(215, 20%, 65%)' }}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-foreground">
            Final Sentiment Analysis
            <Badge 
              className="text-white font-semibold"
              style={{ backgroundColor: chartConfig[data.conclusion?.final_sentiment]?.color || 'hsl(215, 20%, 65%)' }}
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
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                  >
                    {finalSentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value) => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Comparison Bar Chart */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Model Comparison</CardTitle>
          <CardDescription>Confidence scores across all three models</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="model" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value) => <span className="text-foreground capitalize">{value}</span>}
                />
                <Bar dataKey="positive" fill={chartConfig.positive.color} name="positive" radius={[2, 2, 0, 0]} />
                <Bar dataKey="neutral" fill={chartConfig.neutral.color} name="neutral" radius={[2, 2, 0, 0]} />
                <Bar dataKey="negative" fill={chartConfig.negative.color} name="negative" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Model Performance Radar</CardTitle>
          <CardDescription>Comparative view of all models across sentiment categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="sentiment" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                />
                <PolarRadiusAxis 
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickCount={4}
                />
                <Radar 
                  name="VADER" 
                  dataKey="VADER" 
                  stroke={chartConfig.vader.color} 
                  fill={chartConfig.vader.color} 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Radar 
                  name="Naive Bayes" 
                  dataKey="Naive Bayes" 
                  stroke={chartConfig.naive_bayes.color} 
                  fill={chartConfig.naive_bayes.color} 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Radar 
                  name="RoBERTa" 
                  dataKey="RoBERTa" 
                  stroke={chartConfig.roberta.color} 
                  fill={chartConfig.roberta.color} 
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Individual Model Details */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* VADER */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              VADER
              {data.vader?.sentiment && (
                <Badge 
                  style={{ backgroundColor: chartConfig[data.vader.sentiment]?.color }} 
                  className="text-white"
                >
                  {data.vader.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Rule-based sentiment analyzer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.vader?.error ? (
              <p className="text-destructive">Error: {data.vader.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.positive.color }}>Positive:</span>
                  <span className="text-foreground">{formatScore(data.vader?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.neutral.color }}>Neutral:</span>
                  <span className="text-foreground">{formatScore(data.vader?.neutral || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.negative.color }}>Negative:</span>
                  <span className="text-foreground">{formatScore(data.vader?.negative || 0)}%</span>
                </div>
                {data.vader?.compound !== undefined && (
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span className="font-semibold text-foreground">Compound:</span>
                    <span className={data.vader.compound >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                      {data.vader.compound.toFixed(3)}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Naive Bayes */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              Naive Bayes
              {data.naive_bayes?.sentiment && (
                <Badge 
                  style={{ backgroundColor: chartConfig[data.naive_bayes.sentiment]?.color }} 
                  className="text-white"
                >
                  {data.naive_bayes.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Machine learning classifier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.naive_bayes?.error ? (
              <p className="text-destructive">Error: {data.naive_bayes.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.positive.color }}>Positive:</span>
                  <span className="text-foreground">{formatScore(data.naive_bayes?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.neutral.color }}>Neutral:</span>
                  <span className="text-foreground">{formatScore(data.naive_bayes?.neutral || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.negative.color }}>Negative:</span>
                  <span className="text-foreground">{formatScore(data.naive_bayes?.negative || 0)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* RoBERTa */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              RoBERTa
              {data.roberta?.sentiment && (
                <Badge 
                  style={{ backgroundColor: chartConfig[data.roberta.sentiment]?.color }} 
                  className="text-white"
                >
                  {data.roberta.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Transformer-based model</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.roberta?.error ? (
              <p className="text-destructive">Error: {data.roberta.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.positive.color }}>Positive:</span>
                  <span className="text-foreground">{formatScore(data.roberta?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.neutral.color }}>Neutral:</span>
                  <span className="text-foreground">{formatScore(data.roberta?.neutral || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: chartConfig.negative.color }}>Negative:</span>
                  <span className="text-foreground">{formatScore(data.roberta?.negative || 0)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Agreement Summary */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Model Agreement Analysis</CardTitle>
          <CardDescription>How the models voted on sentiment classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background border">
              <div 
                className="text-2xl font-bold" 
                style={{ color: chartConfig.positive.color }}
              >
                {data.conclusion?.positive?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Positive</div>
              {data.conclusion?.positive?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.positive.map((model, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {getModelDisplayName(model)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center p-4 rounded-lg bg-background border">
              <div 
                className="text-2xl font-bold" 
                style={{ color: chartConfig.neutral.color }}
              >
                {data.conclusion?.neutral?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Neutral</div>
              {data.conclusion?.neutral?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.neutral.map((model, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {getModelDisplayName(model)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center p-4 rounded-lg bg-background border">
              <div 
                className="text-2xl font-bold" 
                style={{ color: chartConfig.negative.color }}
              >
                {data.conclusion?.negative?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Negative</div>
              {data.conclusion?.negative?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.negative.map((model, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {getModelDisplayName(model)}
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