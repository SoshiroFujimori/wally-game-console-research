// External experiment: one outstanding word, APB completes after GPU acceptance.
// No queue. Payload is held until the four-phase request/acknowledge completes.
module command_mailbox(
  input logic s_axis_aclk, s_axis_aresetn, m_axis_aclk, m_axis_aresetn,
  input logic s_axis_tvalid, s_axis_tlast,
  input logic [31:0] s_axis_tdata,
  output logic s_axis_tready,
  output logic m_axis_tvalid, m_axis_tlast,
  output logic [31:0] m_axis_tdata,
  input logic m_axis_tready
);
  wire Resetn = s_axis_aresetn & m_axis_aresetn;
  (* ASYNC_REG = "TRUE" *) logic [1:0] SrcReset, DstReset;
  always_ff @(posedge s_axis_aclk or negedge Resetn)
    if (!Resetn) SrcReset <= '0;
    else SrcReset <= {SrcReset[0], 1'b1};
  always_ff @(posedge m_axis_aclk or negedge Resetn)
    if (!Resetn) DstReset <= '0;
    else DstReset <= {DstReset[0], 1'b1};

  typedef enum logic [1:0] {SIDLE, SACK, SCLEAR} source_state;
  typedef enum logic [1:0] {DIDLE, DVALID, DCLEAR} dest_state;
  source_state SourceState;
  dest_state DestState;
  logic Request, Ack;
  logic [32:0] SourceData, DestData;
  (* ASYNC_REG = "TRUE" *) logic [1:0] RequestSync, AckSync;
  always_ff @(posedge s_axis_aclk)
    if (!SrcReset[1]) AckSync <= '0;
    else AckSync <= {AckSync[0], Ack};
  always_ff @(posedge m_axis_aclk)
    if (!DstReset[1]) RequestSync <= '0;
    else RequestSync <= {RequestSync[0], Request};
  assign s_axis_tready = SrcReset[1] && SourceState == SACK && AckSync[1];
  assign m_axis_tvalid = DstReset[1] && DestState == DVALID;
  assign {m_axis_tlast, m_axis_tdata} = DestData;
  always_ff @(posedge s_axis_aclk)
    if (!SrcReset[1]) begin
      SourceState <= SIDLE;
      Request <= 1'b0;
      SourceData <= '0;
    end else case (SourceState)
      SIDLE: if (s_axis_tvalid) begin
        SourceData <= {s_axis_tlast, s_axis_tdata};
        Request <= 1'b1;
        SourceState <= SACK;
      end
      SACK: if (s_axis_tvalid && s_axis_tready) begin
        Request <= 1'b0;
        SourceState <= SCLEAR;
      end
      SCLEAR: if (!AckSync[1]) SourceState <= SIDLE;
      default: SourceState <= SIDLE;
    endcase
  always_ff @(posedge m_axis_aclk)
    if (!DstReset[1]) begin
      DestState <= DIDLE;
      Ack <= 1'b0;
      DestData <= '0;
    end else case (DestState)
      DIDLE: if (RequestSync[1]) begin
        DestData <= SourceData;
        DestState <= DVALID;
      end
      DVALID: if (m_axis_tready) begin
        Ack <= 1'b1;
        DestState <= DCLEAR;
      end
      DCLEAR: if (!RequestSync[1]) begin
        Ack <= 1'b0;
        DestState <= DIDLE;
      end
      default: DestState <= DIDLE;
    endcase
endmodule
