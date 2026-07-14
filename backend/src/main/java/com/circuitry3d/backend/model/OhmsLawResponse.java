package com.circuitry3d.backend.model;

public class OhmsLawResponse {
  private double voltage; // V
  private double current; // A
  private double resistance; // Ω
  private double power; // W

  public OhmsLawResponse(double voltage, double current, double resistance) {
    this.voltage = voltage;
    this.current = current;
    this.resistance = resistance;
    this.power = voltage * current;
  }

  public double getVoltage() { return voltage; }
  public double getCurrent() { return current; }
  public double getResistance() { return resistance; }
  public double getPower() { return power; }
}
