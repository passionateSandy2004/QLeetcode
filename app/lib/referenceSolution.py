import numpy as np

def solution(A, B):
    """
    Compute the Kronecker product (tensor product) of two matrices.
    
    Args:
        A: First matrix (numpy array)
        B: Second matrix (numpy array)
    
    Returns:
        The Kronecker product of A and B
    """
    m, n = A.shape
    p, q = B.shape
    
    # Initialize the result matrix
    result = np.zeros((m * p, n * q))
    
    # Compute the Kronecker product
    for i in range(m):
        for j in range(n):
            result[i*p:(i+1)*p, j*q:(j+1)*q] = A[i,j] * B
            
    return result 