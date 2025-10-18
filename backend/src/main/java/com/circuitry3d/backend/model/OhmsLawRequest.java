package com.circuitry3d.backend.model;

public class OhmsLawRequest {
  private Double voltage; // E (V)
  private Double current; // I (A)
  private Double resistance; // R (Ω)

  public Double getVoltage() { return voltage; }
  public void setVoltage(Double voltage) { this.voltage = voltage; }
  public Double getCurrent() { return current; }
  public void setCurrent(Double current) { this.current = current; }
  public Double getResistance() { return resistance; }
  public void setResistance(Double resistance) { this.resistance = resistance; }
}
