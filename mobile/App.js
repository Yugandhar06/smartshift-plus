import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Switch, FlatList, Alert, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import axios from "axios";

const API_BASE = "http://10.0.2.2:8000/api"; 

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (phone.length < 10) {
      Alert.alert("Error", "Enter local 10-digit phone");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, {
        phone: phone,
        name: "Mock Rider",
        role: "rider",
        platform: "swiggy",
        home_zone_id: 1
      });
      navigation.navigate("Onboarding", { user: res.data });
    } catch (e) {
      // If already exists, try login
      try {
        const res = await axios.post(`${API_BASE}/auth/login?phone=${phone}`);
        navigation.navigate("MainTabs", { user: res.data });
      } catch (err) {
        Alert.alert("Error", "Failed to connect to backend");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.scrollContent, { justifyContent: "center", flex: 1 }]}>
        <Text style={styles.title}>SmartShift+</Text>
        <Text style={styles.subtitle}>Rider Registration & Login</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: "#2563EB" }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Get Started</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function OnboardingScreen({ navigation, route }) {
  const user = route.params?.user || { id: 1 };
  const [loading, setLoading] = useState(false);
  const plans = [
    { name: "Bronze", type: "Bronze", price: 29, coverage: 0.40, color: "#CD7F32" },
    { name: "Silver", type: "Silver", price: 49, coverage: 0.60, color: "#C0C0C0" },
    { name: "Gold", type: "Gold", price: 89, coverage: 0.90, color: "#FFD700" },
  ];

  const handleSelectPlan = async (plan) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/users/${user.id}/plans`, {
        plan_type: plan.type,
        weekly_premium: plan.price.toString(),
        coverage_ratio: plan.coverage.toString(),
        max_payout: "3000.00",
        hours_limit: 40,
        start_date: new Date().toISOString().split("T")[0],
        status: "active",
        user_id: user.id
      });
      navigation.replace("MainTabs");
    } catch (error) {
      console.error("Policy Error:", error);
      Alert.alert("Error", error.response?.data?.detail || "Backend Unreachable");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scrollContent}>
        <Text style={styles.title}>SmartShift+</Text>
        <Text style={styles.subtitle}>Gig work insurance that actually works. Choose a plan:</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : (
          plans.map((plan) => (
            <TouchableOpacity 
              key={plan.name} 
              style={[styles.card, { borderLeftWidth: 8, borderLeftColor: plan.color }]}
              onPress={() => handleSelectPlan(plan)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={styles.cardHeader}>{plan.name} Plan</Text>
                  <Text style={styles.riskLabel}>{(plan.coverage * 100)}% Income Protection</Text>
                </View>
                <Text style={styles.statValue}>₹{plan.price}/wk</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

function DashboardScreen() {
  const [score, setScore] = useState("--");
  const [isShiftActive, setIsShiftActive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await axios.get(`${API_BASE}/zones/scores`);
        if (resp.data.value && resp.data.value[0]) setScore(resp.data.value[0].score);
      } catch (e) { console.log(e); }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleShift = async () => {
    if (!isShiftActive) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Permission to access location was denied");
        return;
      }
    }
    setIsShiftActive(!isShiftActive);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Safety</Text>
          <Text style={styles.subtitle}>Indiranagar, Bangalore</Text>
        </View>

        <View style={[styles.card, { alignItems: "center", backgroundColor: isShiftActive ? "#EEF2FF" : "#FFF" }]}>
          <Text style={styles.cardHeader}>Zone SafarScore</Text>
          <Text style={[styles.scoreText, { color: score > 70 ? "#EF4444" : "#F59E0B" }]}>{score}</Text>
          <Text style={styles.riskLabel}>{score > 70 ? "High Risk - Payouts Likely" : "Moderate Conditions"}</Text>
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={styles.cardHeader}>Shift Status</Text>
              <Text style={styles.subtitle}>{isShiftActive ? "Monitoring Active" : "Offline"}</Text>
            </View>
            <Switch value={isShiftActive} onValueChange={toggleShift} />
          </View>
        </View>

        {isShiftActive && (
          <View style={[styles.card, { backgroundColor: "#10B981", borderLeftWidth: 0 }]}>
            <Text style={[styles.cardHeader, { color: "#FFF" }]}>TrustMesh Active</Text>
            <Text style={{ color: "#FFF", fontSize: 12, marginTop: 4 }}>BPS: 98 (Hardware Verified)</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PayoutsScreen() {
  const [payouts] = useState([
    { id: 1, date: "12 Apr", amount: "₹220", status: "Paid", reason: "Rainfall Disruption" },
    { id: 2, date: "08 Apr", amount: "₹140", status: "Paid", reason: "AQI Health Hazard" },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scrollContent}>
        <Text style={styles.title}>Payout History</Text>
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={styles.cardHeader}>{item.reason}</Text>
                  <Text style={styles.subtitle}>{item.date}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.statValue, { color: "#10B981" }]}>{item.amount}</Text>
                  <Text style={{ fontSize: 10, color: "#6B7280" }}>{item.status}</Text>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Live" component={DashboardScreen} />
      <Tab.Screen name="Payouts" component={PayoutsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  input: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 20,
    marginBottom: 10,
    fontSize: 16
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: { fontSize: 16, fontWeight: "700", color: "#374151" },
  scoreText: { fontSize: 56, fontWeight: "900", marginVertical: 8 },
  riskLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#2563EB" },
});
