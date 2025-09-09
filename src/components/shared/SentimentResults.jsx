import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// Color scheme for sentiments
const SENTIMENT_COLORS = {
  positive: "#10b981", // green
  negative: "#ef4444", // red
  neutral: "#6b7280", // gray
};

// Enhanced background colors for Model Agreement Analysis
const ENHANCED_SENTIMENT_COLORS = {
  positive: "#10b98120", // green with 20% opacity (was 10%)
  negative: "#ef444420", // red with 20% opacity (was 10%)
  neutral: "#6b728020", // gray with 20% opacity (was 10%)
};

const getSentimentColor = (sentiment) =>
  SENTIMENT_COLORS[sentiment] || "#6b7280";

const formatScore = (score) => (score * 100).toFixed(1);

const getModelDisplayName = (modelKey) => {
  const modelNames = {
    vader: "VADER",
    naive_bayes: "Naive Bayes",
    roberta: "RoBERTa",
  };
  return modelNames[modelKey] || modelKey;
};

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-lg p-3 shadow-lg">
        {label && <p className="text-gray-200 font-medium mb-2">{label}</p>}
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${typeof entry.value === 'number' ? formatScore(entry.value) + '%' : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom tooltip for pie chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-lg p-3 shadow-lg">
        <p className="text-sm text-gray-200">
          {`${payload[0].name}: ${payload[0].value} models`}
        </p>
      </div>
    );
  }
  return null;
};

const SentimentResults = ({ data }) => {
  if (!data) return null;

  // Ensure consistent ordering: positive, neutral, negative
  const comparisonData = [
    {
      model: "VADER",
      positive: data.vader?.positive || 0,
      neutral: data.vader?.neutral || 0,
      negative: data.vader?.negative || 0,
      sentiment: data.vader?.sentiment || "error",
    },
    {
      model: "Naive Bayes",
      positive: data.naive_bayes?.positive || 0,
      neutral: data.naive_bayes?.neutral || 0,
      negative: data.naive_bayes?.negative || 0,
      sentiment: data.naive_bayes?.sentiment || "error",
    },
    {
      model: "RoBERTa",
      positive: data.roberta?.positive || 0,
      neutral: data.roberta?.neutral || 0,
      negative: data.roberta?.negative || 0,
      sentiment: data.roberta?.sentiment || "error",
    },
  ];

  // Pie chart data with consistent ordering
  const finalSentimentData = [
    {
      name: "Positive",
      value: data.conclusion?.positive?.length || 0,
      color: SENTIMENT_COLORS.positive,
    },
    {
      name: "Neutral", 
      value: data.conclusion?.neutral?.length || 0,
      color: SENTIMENT_COLORS.neutral,
    },
    {
      name: "Negative",
      value: data.conclusion?.negative?.length || 0,
      color: SENTIMENT_COLORS.negative,
    },
  ].filter((item) => item.value > 0);

  // Radar chart data with consistent ordering
  const radarData = [
    {
      sentiment: "Positive",
      VADER: data.vader?.positive || 0,
      "Naive Bayes": data.naive_bayes?.positive || 0,
      RoBERTa: data.roberta?.positive || 0,
    },
    {
      sentiment: "Neutral",
      VADER: data.vader?.neutral || 0,
      "Naive Bayes": data.naive_bayes?.neutral || 0,
      RoBERTa: data.roberta?.neutral || 0,
    },
    {
      sentiment: "Negative",
      VADER: data.vader?.negative || 0,
      "Naive Bayes": data.naive_bayes?.negative || 0,
      RoBERTa: data.roberta?.negative || 0,
    },
  ];

  return (
    <div className="space-y-6 [&_.card]:bg-gray-900/40 [&_.card]:backdrop-blur-sm [&_.card]:border [&_.card]:border-gray-800/60 [&_.card]:rounded-2xl [&_.card]:shadow-lg">
      {/* Final Result Card */}
      <Card className="bg-gray-900/40 backdrop-blur-sm border border-gray-800/60 rounded-2xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-gray-200">
            Final Sentiment Analysis
            <Badge
              className="text-white font-semibold shadow-sm"
              style={{
                backgroundColor: getSentimentColor(
                  data.conclusion?.final_sentiment
                ),
              }}
            >
              {data.conclusion?.final_sentiment?.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Consensus from{" "}
            {comparisonData.filter((m) => m.sentiment !== "error").length} models
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
                    stroke="none"
                  >
                    {finalSentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-200">Model Comparison</CardTitle>
          <CardDescription className="text-muted-foreground">
            Confidence scores across all three models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="model" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar
                  dataKey="positive"
                  fill={SENTIMENT_COLORS.positive}
                  name="Positive"
                />
                <Bar
                  dataKey="neutral"
                  fill={SENTIMENT_COLORS.neutral}
                  name="Neutral"
                />
                <Bar
                  dataKey="negative"
                  fill={SENTIMENT_COLORS.negative}
                  name="Negative"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-200">
            Model Performance Radar
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Comparative view of all models across sentiment categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid strokeOpacity={0.2} />
                <PolarAngleAxis dataKey="sentiment" stroke="#9ca3af" />
                <PolarRadiusAxis
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  stroke="#9ca3af"
                />
                <Radar
                  name="VADER"
                  dataKey="VADER"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Naive Bayes"
                  dataKey="Naive Bayes"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
                <Radar
                  name="RoBERTa"
                  dataKey="RoBERTa"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.1}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                />
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
            <CardTitle className="flex items-center gap-2 text-gray-200">
              VADER
              {data.vader?.sentiment && (
                <Badge
                  style={{
                    backgroundColor: getSentimentColor(data.vader.sentiment),
                  }}
                  className="text-white"
                >
                  {data.vader.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Rule-based sentiment analyzer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-300">
            {data.vader?.error ? (
              <p className="text-red-400">Error: {data.vader.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-green-400">Positive:</span>
                  <span>{formatScore(data.vader?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Neutral:</span>
                  <span>{formatScore(data.vader?.neutral || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">Negative:</span>
                  <span>{formatScore(data.vader?.negative || 0)}%</span>
                </div>
                {data.vader?.compound !== undefined && (
                  <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span className="font-semibold">Compound:</span>
                    <span
                      className={
                        data.vader.compound >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
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
            <CardTitle className="flex items-center gap-2 text-gray-200">
              Naive Bayes
              {data.naive_bayes?.sentiment && (
                <Badge
                  style={{
                    backgroundColor: getSentimentColor(
                      data.naive_bayes.sentiment
                    ),
                  }}
                  className="text-white"
                >
                  {data.naive_bayes.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Machine learning classifier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-300">
            {data.naive_bayes?.error ? (
              <p className="text-red-400">Error: {data.naive_bayes.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-green-400">Positive:</span>
                  <span>{formatScore(data.naive_bayes?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Neutral:</span>
                  <span>{formatScore(data.naive_bayes?.neutral || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">Negative:</span>
                  <span>{formatScore(data.naive_bayes?.negative || 0)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* RoBERTa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-200">
              RoBERTa
              {data.roberta?.sentiment && (
                <Badge
                  style={{
                    backgroundColor: getSentimentColor(data.roberta.sentiment),
                  }}
                  className="text-white"
                >
                  {data.roberta.sentiment}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Transformer-based model
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-300">
            {data.roberta?.error ? (
              <p className="text-red-400">Error: {data.roberta.error}</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-green-400">Positive:</span>
                  <span>{formatScore(data.roberta?.positive || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Neutral:</span>
                  <span>{formatScore(data.roberta?.neutral || 0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-400">Negative:</span>
                  <span>{formatScore(data.roberta?.negative || 0)}%</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Model Agreement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-200">
            Model Agreement Analysis
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            How the models voted on sentiment classification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: ENHANCED_SENTIMENT_COLORS.positive }}
            >
              <div
                className="text-2xl font-bold"
                style={{ color: SENTIMENT_COLORS.positive }}
              >
                {data.conclusion?.positive?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Positive</div>
              {data.conclusion?.positive?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.positive.map((model, idx) => (
                    <Badge 
                      key={idx} 
                      className="text-xs bg-gray-700/80 text-gray-200 hover:bg-gray-700 border-gray-600"
                    >
                      {getModelDisplayName(model)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: ENHANCED_SENTIMENT_COLORS.neutral }}
            >
              <div
                className="text-2xl font-bold"
                style={{ color: SENTIMENT_COLORS.neutral }}
              >
                {data.conclusion?.neutral?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Neutral</div>
              {data.conclusion?.neutral?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.neutral.map((model, idx) => (
                    <Badge 
                      key={idx} 
                      className="text-xs bg-gray-700/80 text-gray-200 hover:bg-gray-700 border-gray-600"
                    >
                      {getModelDisplayName(model)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: ENHANCED_SENTIMENT_COLORS.negative }}
            >
              <div
                className="text-2xl font-bold"
                style={{ color: SENTIMENT_COLORS.negative }}
              >
                {data.conclusion?.negative?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Voted Negative</div>
              {data.conclusion?.negative?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 justify-center">
                  {data.conclusion.negative.map((model, idx) => (
                    <Badge 
                      key={idx} 
                      className="text-xs bg-gray-700/80 text-gray-200 hover:bg-gray-700 border-gray-600"
                    >
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