package com.circuitry3d.backend.controller;

import com.circuitry3d.backend.model.OhmsLawResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = {"http://localhost:5173"})
public class OhmsLawController {

  // GET /api/ohms?voltage=..&resistance=..&current=..
  @GetMapping("/api/ohms")
  public ResponseEntity<?> compute(
      @RequestParam(value = "voltage", required = false) Double voltage,
      @RequestParam(value = "current", required = false) Double current,
      @RequestParam(value = "resistance", required = false) Double resistance
  ) {
    try {
      // Ohm's law relationships:
      // V = I * R, I = V / R, R = V / I
      int provided = (voltage != null ? 1 : 0) + (current != null ? 1 : 0) + (resistance != null ? 1 : 0);
      if (provided < 2) {
        return ResponseEntity.badRequest().body("Provide at least two of voltage/current/resistance");
      }

      double v, i, r;
      if (voltage != null && resistance != null) {
        v = voltage;
        r = resistance == 0 ? Double.POSITIVE_INFINITY : resistance;
        i = r == 0 || Double.isInfinite(r) ? 0 : v / r;
      } else if (voltage != null && current != null) {
        v = voltage;
        i = current;
        r = i == 0 ? Double.POSITIVE_INFINITY : v / i;
      } else if (current != null && resistance != null) {
        i = current;
        r = resistance;
        v = i * r;
      } else {
        return ResponseEntity.badRequest().body("Unsupported combination");
      }

      if (Double.isNaN(v) || Double.isNaN(i) || Double.isNaN(r)) {
        return ResponseEntity.badRequest().body("Invalid values");
      }

      return ResponseEntity.ok(new OhmsLawResponse(v, i, r));
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
    }
  }
}
